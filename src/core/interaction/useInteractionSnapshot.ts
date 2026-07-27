import { useSyncExternalStore } from 'react';
import { interactionRuntime } from './InteractionRuntime';

export function useInteractionSnapshot() {
  return useSyncExternalStore(interactionRuntime.subscribe, interactionRuntime.getSnapshot, interactionRuntime.getServerSnapshot);
}
