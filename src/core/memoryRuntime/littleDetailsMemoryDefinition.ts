import type { RuntimeMemoryDefinition } from './types';

export const LITTLE_DETAILS_MEMORY_ID = 'production.memory.little-details';
export const LITTLE_DETAILS_INTERACTION_ID = 'interaction.memory.little-details';
export const LITTLE_DETAILS_WORLD_ACTION_ID = 'memory.little-details.set-inlay-stage';
export const LITTLE_DETAILS_ANCHOR = [20, 0.035, -126] as const;
export const LITTLE_DETAILS_ACTIVATION_DISTANCE = 6.2;

export const LITTLE_DETAILS_MEMORY: RuntimeMemoryDefinition = {
  id: LITTLE_DETAILS_MEMORY_ID,
  sourceMemoryId: 'memory.little-details',
  label: 'The Careless Days — production memory',
  triggerInteractionId: LITTLE_DETAILS_INTERACTION_ID,
  contentVersion: 2,
  behavior: 'replayable',
  persistence: 'completion',
  restorePolicy: 'resume-checkpoint',
  cancellationPolicy: 'allow',
  accessibilityLabel: 'Remember The Careless Days',
  completionFlags: ['memory.little-details.effortless-trust'],
  steps: [
    { id: 'acquire-memory-ownership', type: 'acquire', resources: ['interaction', 'traversal', 'camera', 'narrative-input', 'modal-ui'] },
    { id: 'settle-at-pool-edge', type: 'camera', position: [25, 2.6, -119], target: [20, 0.08, -130], durationMs: 1100 },
    { id: 'family-categories', type: 'dialogue', speaker: 'Every morning care', text: 'You prepare my office clothes so attentively every morning...' },
    { id: 'after-detail-categories', type: 'checkpoint' },
    { id: 'inlay-stage-one', type: 'world-action', actionId: LITTLE_DETAILS_WORLD_ACTION_ID, payload: { stage: 1 } },
    { id: 'everything-else', type: 'dialogue', speaker: 'Every morning care', text: '...and keep everything so perfectly sorted for me.' },
    { id: 'inlay-stage-two', type: 'world-action', actionId: LITTLE_DETAILS_WORLD_ACTION_ID, payload: { stage: 2 } },
    { id: 'without-hesitation', type: 'dialogue', speaker: 'A playful pampering', text: 'You have taken such good care of me that I have become completely spoiled...' },
    { id: 'ordinary-world', type: 'dialogue', speaker: 'A playful pampering', text: '...so spoiled that I do not even know where my own socks are anymore!' },
    { id: 'before-complete-pattern', type: 'checkpoint' },
    { id: 'inlay-stage-three', type: 'world-action', actionId: LITTLE_DETAILS_WORLD_ACTION_ID, payload: { stage: 3 } },
    { id: 'effortless-trust', type: 'dialogue', speaker: 'A playful pampering', text: 'It is a small daily routine, but it shows how deeply you care for me.' },
    { id: 'inlay-clear', type: 'world-action', actionId: LITTLE_DETAILS_WORLD_ACTION_ID, payload: { stage: 0 } },
    { id: 'complete-little-details', type: 'complete' },
  ],
};
