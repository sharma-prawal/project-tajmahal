import type { RuntimeMemoryDefinition } from './types';

export const FRIDAY_NIGHT_MEMORY_ID = 'production.memory.friday-night';
export const FRIDAY_NIGHT_INTERACTION_ID = 'interaction.memory.friday-night';
export const FRIDAY_NIGHT_WORLD_ACTION_ID = 'memory.friday-night.set-enclosure-stage';
export const FRIDAY_NIGHT_ANCHOR = [-28.5, 0.03, -163.5] as const;
export const FRIDAY_NIGHT_ACTIVATION_DISTANCE = 6.2;
export const FRIDAY_NIGHT_SCREEN_SIZE = [0.14, 0.48, 0.92] as const;
export const FRIDAY_NIGHT_SCREEN_COUNT = 6;

export const FRIDAY_NIGHT_MEMORY: RuntimeMemoryDefinition = {
  id: FRIDAY_NIGHT_MEMORY_ID,
  sourceMemoryId: 'memory.friday-night',
  label: 'Family & Blessings — production memory',
  triggerInteractionId: FRIDAY_NIGHT_INTERACTION_ID,
  contentVersion: 2,
  behavior: 'replayable',
  persistence: 'completion',
  restorePolicy: 'resume-checkpoint',
  cancellationPolicy: 'allow',
  accessibilityLabel: 'Remember Family and Blessings',
  completionFlags: ['memory.friday-night.trust-seen'],
  steps: [
    { id: 'acquire-memory-ownership', type: 'acquire', resources: ['interaction', 'traversal', 'camera', 'narrative-input', 'modal-ui'] },
    { id: 'settle-near-open-enclosure', type: 'camera', position: [-28.3, 2.3, -158.3], target: [-28.5, 0.5, -164.2], durationMs: 1200 },
    { id: 'friday-night', type: 'dialogue', speaker: 'A proud reflection', text: 'Post Shivani’s marriage...' },
    { id: 'enclosure-stage-one', type: 'world-action', actionId: FRIDAY_NIGHT_WORLD_ACTION_ID, payload: { stage: 1 } },
    { id: 'vulnerable-side', type: 'dialogue', speaker: 'A proud reflection', text: '...the way you stand by our mother and father makes me immensely proud.' },
    { id: 'after-vulnerability-introduced', type: 'checkpoint' },
    { id: 'enclosure-stage-two', type: 'world-action', actionId: FRIDAY_NIGHT_WORLD_ACTION_ID, payload: { stage: 2 } },
    { id: 'perhaps-weak', type: 'dialogue', speaker: 'Family bond', text: 'They do so much for us...' },
    { id: 'not-hide', type: 'dialogue', speaker: 'Family bond', text: '...and the love and respect you give them means everything to me.' },
    { id: 'not-weakness', type: 'dialogue', speaker: 'Family bond', text: 'Having a great family bond and their blessings will always keep us happy and cared for.' },
    { id: 'after-acceptance-reflection', type: 'checkpoint' },
    { id: 'enclosure-stage-three', type: 'world-action', actionId: FRIDAY_NIGHT_WORLD_ACTION_ID, payload: { stage: 3 } },
    { id: 'trust-it-took', type: 'dialogue', speaker: 'What matters', text: 'Keep showing them that love...' },
    { id: 'let-seen', type: 'dialogue', speaker: 'What matters', text: '...and our family will always flourish with warmth and grace.' },
    { id: 'after-trust-conclusion', type: 'checkpoint' },
    { id: 'enclosure-stage-three-restore', type: 'world-action', actionId: FRIDAY_NIGHT_WORLD_ACTION_ID, payload: { stage: 3 } },
    { id: 'hold-empty-centre', type: 'wait', durationMs: 700 },
    { id: 'enclosure-clear', type: 'world-action', actionId: FRIDAY_NIGHT_WORLD_ACTION_ID, payload: { stage: 0 } },
    { id: 'complete-friday-night', type: 'complete' },
  ],
};
