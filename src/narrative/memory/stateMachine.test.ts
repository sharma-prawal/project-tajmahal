import { describe, expect, it } from 'vitest';
import { isTerminal, nextPhase } from './stateMachine';

describe('nextPhase', () => {
  it('walks the full happy path idle -> cued -> engaged -> revealing -> complete', () => {
    let phase = nextPhase('idle', 'cue');
    expect(phase).toBe('cued');
    phase = nextPhase(phase, 'engage');
    expect(phase).toBe('engaged');
    phase = nextPhase(phase, 'reveal');
    expect(phase).toBe('revealing');
    phase = nextPhase(phase, 'complete');
    expect(phase).toBe('complete');
  });

  it('cancels cleanly from cued back to idle with no side effects modeled', () => {
    expect(nextPhase('cued', 'cancel')).toBe('idle');
  });

  it('cancels cleanly from engaged back to idle', () => {
    expect(nextPhase('engaged', 'cancel')).toBe('idle');
  });

  it('cancels cleanly from revealing back to idle', () => {
    expect(nextPhase('revealing', 'cancel')).toBe('idle');
  });

  it('is idempotent once complete — every event keeps it complete', () => {
    for (const event of ['cue', 'engage', 'cancel', 'reveal', 'complete'] as const) {
      expect(nextPhase('complete', event)).toBe('complete');
    }
  });

  it('ignores an out-of-order event instead of throwing (e.g. reveal while idle)', () => {
    expect(nextPhase('idle', 'reveal')).toBe('idle');
    expect(nextPhase('idle', 'complete')).toBe('idle');
    expect(nextPhase('cued', 'reveal')).toBe('cued');
  });

  it('is deterministic — same phase+event always yields the same result', () => {
    const results = new Set<string>();
    for (let i = 0; i < 5; i += 1) results.add(nextPhase('engaged', 'reveal'));
    expect(results.size).toBe(1);
  });
});

describe('isTerminal', () => {
  it('is true only for complete', () => {
    expect(isTerminal('complete')).toBe(true);
    expect(isTerminal('idle')).toBe(false);
    expect(isTerminal('revealing')).toBe(false);
  });
});
