import { AXIS_LAYOUT, PAVILION } from '@constants/world';
import type { RuntimeMemoryDefinition } from './types';

export const UMBRELLA_MEMORY_ID = 'production.memory.umbrella';
export const UMBRELLA_INTERACTION_ID = 'interaction.memory.umbrella';
export const UMBRELLA_WORLD_ACTION_ID = 'memory.umbrella.set-path-accent';
export const UMBRELLA_ANCHOR = [PAVILION.axisOffset - PAVILION.width / 2 - 1.8, 0, (AXIS_LAYOUT.approachStart + AXIS_LAYOUT.approachEnd) / 2] as const;

export const UMBRELLA_MEMORY: RuntimeMemoryDefinition = {
  id: UMBRELLA_MEMORY_ID,
  sourceMemoryId: 'memory.umbrella',
  label: 'Fried Rice & Love — production memory',
  triggerInteractionId: UMBRELLA_INTERACTION_ID,
  contentVersion: 2,
  behavior: 'replayable',
  persistence: 'completion',
  restorePolicy: 'resume-checkpoint',
  cancellationPolicy: 'allow',
  accessibilityLabel: 'Remember Fried Rice and Love',
  completionFlags: ['memory.umbrella.thoughtful-reminder'],
  steps: [
    { id: 'acquire-memory-ownership', type: 'acquire', resources: ['interaction', 'traversal', 'camera', 'narrative-input', 'modal-ui'] },
    { id: 'settle-beside-shelter', type: 'camera', position: [18.5, 3.4, -134.5], target: [25.7, 1, -141.5], durationMs: 1100 },
    { id: 'umbrella-reminder', type: 'dialogue', speaker: 'A love language', text: 'Whenever I request it, you happily cook for me—especially your delicious fried rice…' },
    { id: 'before-walk-outside', type: 'checkpoint' },
    { id: 'walk-outside', type: 'dialogue', speaker: 'A love language', text: '…stepping into the kitchen with so much warmth and care.' },
    { id: 'path-accent-on', type: 'world-action', actionId: UMBRELLA_WORLD_ACTION_ID, payload: { active: true } },
    { id: 'meaningful-thought', type: 'dialogue', speaker: 'A love language', text: 'Every time you prepare it, it speaks your love language louder than any words ever could.' },
    { id: 'path-accent-off', type: 'world-action', actionId: UMBRELLA_WORLD_ACTION_ID, payload: { active: false } },
    { id: 'complete-umbrella', type: 'complete' },
  ],
};
