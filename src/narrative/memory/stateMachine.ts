import type { MemoryEvent, MemoryPhase } from './types';

/**
 * Pure transition table shared by all seven memories — deterministic
 * (same phase + event always produces the same result) and safe to call
 * repeatedly (unhandled phase/event combinations are no-ops, not errors).
 * `complete` is a terminal, idempotent state: any event once complete
 * stays complete, satisfying "re-triggering a completed memory is a no-op."
 */
export function nextPhase(phase: MemoryPhase, event: MemoryEvent): MemoryPhase {
  if (phase === 'complete') return 'complete';

  switch (phase) {
    case 'idle':
      return event === 'cue' ? 'cued' : 'idle';
    case 'cued':
      if (event === 'engage') return 'engaged';
      if (event === 'cancel') return 'idle';
      return 'cued'; // re-cue is a no-op stay
    case 'engaged':
      if (event === 'reveal') return 'revealing';
      if (event === 'cancel') return 'idle';
      return 'engaged';
    case 'revealing':
      if (event === 'complete') return 'complete';
      if (event === 'cancel') return 'idle';
      return 'revealing';
    default:
      return phase;
  }
}

export function isTerminal(phase: MemoryPhase): boolean {
  return phase === 'complete';
}
