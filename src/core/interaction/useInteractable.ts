import { useEffect } from 'react';
import type { InteractionDefinition } from './types';
import { interactionRuntime } from './InteractionRuntime';

export function useInteractable(definition: InteractionDefinition): void {
  useEffect(() => interactionRuntime.registry.register(definition), [definition]);
}
