import type { RuntimeMemoryDefinition } from './types';

export const MINTS_MEMORY_ID = 'production.memory.mints';
export const MINTS_INTERACTION_ID = 'interaction.memory.mints';
export const MINTS_WORLD_ACTION_ID = 'memory.mints.show-accepted-mints';
export const MINTS_ANCHOR = [22, 0.22, -70] as const;
export const MINTS_ACTIVATION_DISTANCE = 5.5;

export const MINTS_MEMORY: RuntimeMemoryDefinition = {
  id: MINTS_MEMORY_ID,
  sourceMemoryId: 'memory.mints',
  label: 'Warmth in Absence — production memory',
  triggerInteractionId: MINTS_INTERACTION_ID,
  contentVersion: 2,
  behavior: 'replayable',
  persistence: 'completion',
  restorePolicy: 'resume-checkpoint',
  cancellationPolicy: 'allow',
  accessibilityLabel: 'Remember Warmth in Absence',
  completionFlags: ['memory.mints.accepted'],
  steps: [
    { id: 'acquire-memory-ownership', type: 'acquire', resources: ['interaction', 'traversal', 'camera', 'narrative-input', 'modal-ui'] },
    { id: 'settle-on-mints', type: 'camera', position: [25.5, 2.55, -64.5], target: [22, 0.42, -70], durationMs: 1000 },
    { id: 'friend-offer-declined', type: 'dialogue', speaker: 'A remembered moment', text: 'When our parents were away in Himachal, you cared for me so completely that I did not have to worry about a single chore.' },
    { id: 'before-acceptance', type: 'checkpoint' },
    { id: 'show-accepted-mints', type: 'world-action', actionId: MINTS_WORLD_ACTION_ID, payload: { visible: true } },
    { id: 'narrator-offer-accepted', type: 'dialogue', speaker: 'A remembered moment', text: 'The delicious food you cooked every day kept me warm, well fed, and completely looked after.' },
    { id: 'quiet-difference', type: 'dialogue', speaker: 'A remembered moment', text: 'It was a quiet kind of love that made home feel so warm and meaningful.' },
    { id: 'complete-mints', type: 'complete' },
  ],
};
