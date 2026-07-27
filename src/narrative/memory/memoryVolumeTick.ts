import type { MemoryPhase } from './types';

/**
 * Phase 10E.1 — one frame of a System A discovery volume, as a pure function.
 *
 * Extracted from `MemoryVolume` so the ownership seam can be *proved* rather
 * than argued about. The component keeps the refs and the store calls; every
 * decision about whether to advance lives here.
 *
 * ## The defect this closes
 *
 * All seven production memories acquire `traversal` for the length of their
 * sequence, and `PlayerController` honours that by freezing the player. So
 * during a cutscene the player is **held still, by design, inside whatever
 * System A volume they happened to trigger it from** — and System A, which took
 * no lease and asked no questions, kept accumulating dwell against them.
 *
 * m3's volume has a 22 m radius and contains both pool production anchors;
 * m4 and m5 contain `back` and `umbrella`. Those are exactly the places a
 * player starts a narrative from. A memory could therefore complete itself
 * while the player was watching a different memory's cutscene, unable to move.
 *
 * ## Pause, not reset or restart
 *
 * While another system owns the experience this returns `idle` and **keeps
 * `elapsedSeconds` untouched**:
 *
 * - *Reset* would silently discard dwell the player had legitimately earned
 *   before the cutscene started, which reads as the world forgetting them.
 * - *Restart* has the same cost plus a hidden re-trigger.
 * - *Pause* preserves the player's progress and cannot leak time, because no
 *   delta is accumulated while ownership is held — there is no stored-up
 *   quantity to release.
 *
 * The one way pause could still misfire is a single enormous frame delta after
 * a stall (a long cutscene, a backgrounded tab, a slow asset load) instantly
 * satisfying a 2-5 s reveal. `MAX_REVEAL_DELTA_SECONDS` clamps that: after any
 * stall the reveal advances by at most one plausible frame, so resuming can
 * never complete a memory the player did not actually dwell through.
 */
export const MAX_REVEAL_DELTA_SECONDS = 0.1;

export type VolumeAction =
  | { kind: 'none' }
  | { kind: 'cue' }
  | { kind: 'engage' }
  | { kind: 'cancel' }
  | { kind: 'reveal' }
  | { kind: 'complete' }
  | { kind: 'progress'; elapsedSeconds: number; fraction: number };

export interface VolumeTick {
  phase: MemoryPhase;
  inVolume: boolean;
  /** M7's `ceremonialConfirm`: needs an explicit input rather than auto-engaging. */
  requiresConfirm: boolean;
  /**
   * True while any other system holds the experience — a System B narrative
   * sequence, or an exploration modal. System A observes but does not act.
   */
  experienceOwned: boolean;
  elapsedSeconds: number;
  deltaSeconds: number;
  revealDurationSeconds: number;
}

export function advanceMemoryVolume(tick: VolumeTick): VolumeAction {
  // Terminal. Nothing re-opens a completed memory.
  if (tick.phase === 'complete') return { kind: 'none' };

  // The coordination rule. Proximity is still *observed* by the caller — the
  // player really is standing here — but nothing advances, and crucially
  // nothing cancels either: a cutscene must not silently undo a cued memory.
  if (tick.experienceOwned) return { kind: 'none' };

  switch (tick.phase) {
    case 'idle':
      return tick.inVolume ? { kind: 'cue' } : { kind: 'none' };
    case 'cued':
      if (!tick.inVolume) return { kind: 'cancel' };
      return tick.requiresConfirm ? { kind: 'none' } : { kind: 'engage' };
    case 'engaged':
      return tick.inVolume ? { kind: 'reveal' } : { kind: 'cancel' };
    case 'revealing': {
      if (!tick.inVolume) return { kind: 'cancel' };
      const delta = Math.min(Math.max(0, tick.deltaSeconds), MAX_REVEAL_DELTA_SECONDS);
      const elapsedSeconds = tick.elapsedSeconds + delta;
      if (elapsedSeconds >= tick.revealDurationSeconds) return { kind: 'complete' };
      return {
        kind: 'progress',
        elapsedSeconds,
        fraction: tick.revealDurationSeconds > 0 ? elapsedSeconds / tick.revealDurationSeconds : 0,
      };
    }
  }
}
