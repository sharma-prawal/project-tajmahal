import { AXIS_LAYOUT, PAVILION } from '@constants/world';
import type { RuntimeMemoryDefinition } from './types';

export const BACK_MEMORY_ID = 'production.memory.back';
export const BACK_INTERACTION_ID = 'interaction.memory.back';
export const BACK_WORLD_ACTION_ID = 'memory.back.set-return-accent';
export const BACK_ANCHOR = [-(PAVILION.axisOffset - PAVILION.width / 2 - 1.8), 0, (AXIS_LAYOUT.approachStart + AXIS_LAYOUT.approachEnd) / 2] as const;

export const BACK_MEMORY: RuntimeMemoryDefinition = {
  id: BACK_MEMORY_ID,
  sourceMemoryId: 'memory.back',
  label: 'A Touch of Sanity — production memory',
  triggerInteractionId: BACK_INTERACTION_ID,
  contentVersion: 2,
  behavior: 'replayable',
  persistence: 'completion',
  restorePolicy: 'resume-checkpoint',
  cancellationPolicy: 'allow',
  accessibilityLabel: 'Remember A Touch of Sanity',
  completionFlags: ['memory.back.returned'],
  steps: [
    { id: 'acquire-memory-ownership', type: 'acquire', resources: ['interaction', 'traversal', 'camera', 'narrative-input', 'modal-ui'] },
    { id: 'settle-at-pavilion', type: 'camera', position: [-18.5, 3.8, -134.5], target: [-25.7, 1.2, -141.5], durationMs: 1100 },
    { id: 'ordinary-breaks', type: 'dialogue', speaker: 'A remembered rhythm', text: 'In the middle of intense company deadlines and project stress, you gently massage my head and feet.' },
    { id: 'before-return', type: 'checkpoint' },
    { id: 'brief-absence', type: 'wait', durationMs: 450 },
    { id: 'back', type: 'dialogue', speaker: 'A comforting touch', text: 'A touch of sanity.', presentation: 'emphasis' },
    { id: 'return-accent-on', type: 'world-action', actionId: BACK_WORLD_ACTION_ID, payload: { active: true } },
    { id: 'quiet-significance', type: 'dialogue', speaker: 'A remembered rhythm', text: 'It brings me back to peace, easing every bit of tension and reminding me that I am safe with you.' },
    { id: 'return-accent-off', type: 'world-action', actionId: BACK_WORLD_ACTION_ID, payload: { active: false } },
    { id: 'complete-back', type: 'complete' },
  ],
};
