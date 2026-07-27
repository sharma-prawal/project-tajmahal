import { MEMORY_GATE_THRESHOLD } from '@narrative/memory/memoryProgress';
import type { InteractionDefinition } from '@core/interaction/types';
import { TAJ_MAIN_DOOR_APPROACH_Z } from '@constants/tajPlacement';

export const MAUSOLEUM_GATE_INTERACTION_ID = 'finale.mausoleum-gate';

export type MausoleumGateState = 'not-ready' | 'ready' | 'entered';

export function mausoleumGateState(progress: number, interactionCompleted: boolean): MausoleumGateState {
  if (interactionCompleted) return 'entered';
  return progress >= MEMORY_GATE_THRESHOLD ? 'ready' : 'not-ready';
}

export function mausoleumGatePrompt(state: MausoleumGateState): string {
  switch (state) {
    case 'not-ready':
      return `The door is sealed — remember ${MEMORY_GATE_THRESHOLD} memories`;
    case 'ready':
      return 'Open the mausoleum';
    case 'entered':
      return 'The doorway is open';
  }
}

export function isMausoleumGateBlocking(_state: MausoleumGateState): boolean {
  return true;
}

export function mausoleumGateDoorAngle(state: MausoleumGateState): number {
  return state === 'entered' ? Math.PI / 2 : 0;
}

export function createMausoleumGateInteraction(state: MausoleumGateState): InteractionDefinition {
  return {
    id: MAUSOLEUM_GATE_INTERACTION_ID,
    type: 'view-and-proximity',
    position: [0, 5.6, TAJ_MAIN_DOOR_APPROACH_Z],
    activationDistance: 5.2,
    focusAngleDegrees: 72,
    priority: 90,
    behavior: 'repeatable',
    persistence: 'completion',
    cooldownMs: 500,
    prompt: mausoleumGatePrompt(state),
    completedPrompt: mausoleumGatePrompt('entered'),
    accessibilityLabel: state === 'not-ready'
      ? `Mausoleum door sealed. Complete all ${MEMORY_GATE_THRESHOLD} memories.`
      : 'Open the mausoleum door',
    completedAccessibilityLabel: 'Enter the open mausoleum',
    onActivate: (context) => {
      if (state !== 'ready') {
        if (state === 'not-ready') context.cancel();
        return;
      }
      context.complete();
    },
  };
}
