import { describe, expect, it } from 'vitest';
import { MAX_REVEAL_DELTA_SECONDS, advanceMemoryVolume, type VolumeTick } from './memoryVolumeTick';
import { MEMORY_PHASES } from './types';

function tick(overrides: Partial<VolumeTick> = {}): VolumeTick {
  return {
    phase: 'revealing',
    inVolume: true,
    requiresConfirm: false,
    experienceOwned: false,
    elapsedSeconds: 0,
    deltaSeconds: 1 / 60,
    revealDurationSeconds: 3,
    ...overrides,
  };
}

describe('memory volume tick — ownership coordination', () => {
  /**
   * The concurrency defect, stated as an executable fact.
   *
   * Without the `experienceOwned` guard, a volume in `revealing` accumulates
   * dwell on every frame — including the frames of a System B cutscene, during
   * which `PlayerController` deliberately freezes the player *inside* that same
   * volume because the narrative holds a `traversal` lease.
   */
  it('DEFECT (guard removed): would complete a memory during a cutscene', () => {
    // Reconstruct the pre-fix behaviour by simply not passing ownership.
    let elapsed = 0;
    for (let frame = 0; frame < 200; frame += 1) {
      const action = advanceMemoryVolume(tick({ elapsedSeconds: elapsed, experienceOwned: false }));
      if (action.kind === 'complete') break;
      if (action.kind === 'progress') elapsed = action.elapsedSeconds;
    }
    expect(elapsed).toBeGreaterThan(0);
    // 200 frames at 1/60 s is 3.3 s — past the 3 s reveal.
    expect(advanceMemoryVolume(tick({ elapsedSeconds: elapsed }))).toMatchObject({ kind: 'complete' });
  });

  it('FIXED: accumulates no dwell while another system owns the experience', () => {
    let elapsed = 0;
    for (let frame = 0; frame < 200; frame += 1) {
      const action = advanceMemoryVolume(tick({ elapsedSeconds: elapsed, experienceOwned: true }));
      expect(action).toEqual({ kind: 'none' });
      if (action.kind === 'progress') elapsed = (action as { elapsedSeconds: number }).elapsedSeconds;
    }
    expect(elapsed).toBe(0);
  });

  it('transitions no phase while owned, from any phase, in or out of the volume', () => {
    for (const phase of MEMORY_PHASES) {
      for (const inVolume of [true, false]) {
        for (const requiresConfirm of [true, false]) {
          expect(advanceMemoryVolume(tick({ phase, inVolume, requiresConfirm, experienceOwned: true })))
            .toEqual({ kind: 'none' });
        }
      }
    }
  });

  /** A cutscene must not silently undo a memory the player had already cued. */
  it('does not cancel a cued memory while owned, even if the player is pushed out', () => {
    expect(advanceMemoryVolume(tick({ phase: 'cued', inVolume: false, experienceOwned: true })))
      .toEqual({ kind: 'none' });
  });

  describe('resume after ownership is released', () => {
    it('preserves dwell earned before the sequence started', () => {
      const before = advanceMemoryVolume(tick({ elapsedSeconds: 1.4 }));
      expect(before).toMatchObject({ kind: 'progress' });
      // …ownership is taken for a while, contributing nothing…
      expect(advanceMemoryVolume(tick({ elapsedSeconds: 1.4, experienceOwned: true }))).toEqual({ kind: 'none' });
      // …and on release the player continues from exactly where they were.
      const after = advanceMemoryVolume(tick({ elapsedSeconds: 1.4 }));
      expect(after).toEqual(before);
    });

    /**
     * The one way pause could still misfire: a single enormous delta after a
     * long cutscene or a backgrounded tab satisfying the whole reveal at once.
     */
    it('cannot complete on a single huge frame after a stall', () => {
      const action = advanceMemoryVolume(tick({ elapsedSeconds: 0, deltaSeconds: 45 }));
      expect(action).toMatchObject({ kind: 'progress' });
      expect((action as { elapsedSeconds: number }).elapsedSeconds).toBeLessThanOrEqual(MAX_REVEAL_DELTA_SECONDS);
    });

    it('still completes normally once the player has genuinely dwelt', () => {
      expect(advanceMemoryVolume(tick({ elapsedSeconds: 2.99 }))).toMatchObject({ kind: 'complete' });
    });

    it('resumes correctly after a cancelled sequence leaves the player outside', () => {
      expect(advanceMemoryVolume(tick({ phase: 'revealing', inVolume: false }))).toEqual({ kind: 'cancel' });
    });
  });

  describe('unowned behaviour is unchanged from Phase 3A', () => {
    it.each([
      ['idle + inside', { phase: 'idle', inVolume: true }, 'cue'],
      ['idle + outside', { phase: 'idle', inVolume: false }, 'none'],
      ['cued + outside', { phase: 'cued', inVolume: false }, 'cancel'],
      ['cued + inside (dwell)', { phase: 'cued', inVolume: true }, 'engage'],
      ['cued + inside (confirm)', { phase: 'cued', inVolume: true, requiresConfirm: true }, 'none'],
      ['engaged + inside', { phase: 'engaged', inVolume: true }, 'reveal'],
      ['engaged + outside', { phase: 'engaged', inVolume: false }, 'cancel'],
    ] as const)('%s → %s', (_label, overrides, expected) => {
      expect(advanceMemoryVolume(tick(overrides)).kind).toBe(expected);
    });

    it('never re-opens a completed memory', () => {
      for (const inVolume of [true, false]) {
        for (const experienceOwned of [true, false]) {
          expect(advanceMemoryVolume(tick({ phase: 'complete', inVolume, experienceOwned })))
            .toEqual({ kind: 'none' });
        }
      }
    });
  });

  describe('progress reporting', () => {
    it('reports a monotonic fraction that never exceeds 1', () => {
      let elapsed = 0;
      let previous = 0;
      for (let frame = 0; frame < 200; frame += 1) {
        const action = advanceMemoryVolume(tick({ elapsedSeconds: elapsed }));
        if (action.kind !== 'progress') break;
        expect(action.fraction).toBeGreaterThanOrEqual(previous);
        expect(action.fraction).toBeLessThanOrEqual(1);
        previous = action.fraction;
        elapsed = action.elapsedSeconds;
      }
    });

    it('does not divide by zero for a zero-duration reveal', () => {
      const action = advanceMemoryVolume(tick({ revealDurationSeconds: 0, elapsedSeconds: 0 }));
      expect(action).toMatchObject({ kind: 'complete' });
    });

    it('ignores negative deltas', () => {
      const action = advanceMemoryVolume(tick({ elapsedSeconds: 1, deltaSeconds: -5 }));
      expect(action).toMatchObject({ kind: 'progress', elapsedSeconds: 1 });
    });
  });
});
