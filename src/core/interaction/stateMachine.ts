import type { InteractionInterruption, InteractionLifecycle } from './types';

export type InteractionEvent =
  | 'focus'
  | 'blur'
  | 'activate'
  | 'started'
  | 'complete'
  | 'cooldown'
  | 'cooldown-ended'
  | 'reset';

export function nextInteractionState(
  state: InteractionLifecycle,
  event: InteractionEvent,
  interruption: InteractionInterruption = 'cancel-on-exit',
): InteractionLifecycle {
  if (event === 'reset') return 'idle';
  if (event === 'focus' && (state === 'idle' || state === 'cancelled')) return 'focused';
  if (event === 'blur') {
    if (state === 'focused') return 'idle';
    if (state === 'activating' || state === 'active') {
      if (interruption === 'ignore') return state;
      if (interruption === 'complete-on-exit') return 'completing';
      return 'cancelled';
    }
  }
  if (event === 'activate' && state === 'focused') return 'activating';
  if (event === 'started' && state === 'activating') return 'active';
  if (event === 'complete' && state === 'active') return 'completing';
  if (event === 'cooldown' && state === 'completing') return 'cooldown';
  if (event === 'complete' && state === 'completing') return 'completed';
  if (event === 'cooldown-ended' && state === 'cooldown') return 'idle';
  return state;
}
