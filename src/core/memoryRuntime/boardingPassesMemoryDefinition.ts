import type { RuntimeMemoryDefinition } from './types';

export const BOARDING_PASSES_MEMORY_ID = 'production.memory.boarding-passes';
export const BOARDING_PASSES_INTERACTION_ID = 'interaction.memory.boarding-passes';
export const BOARDING_PASSES_WORLD_ACTION_ID = 'memory.boarding-passes.set-collaboration-stage';
export const BOARDING_PASSES_ANCHOR = [-24, 0.02, -105] as const;
export const BOARDING_PASSES_ACTIVATION_DISTANCE = 6.2;
export const BOARDING_PASSES_TILE_SIZE = [0.72, 0.035, 0.72] as const;
export const BOARDING_PASSES_TILE_COUNT = 12;

export const BOARDING_PASSES_MEMORY: RuntimeMemoryDefinition = {
  id: BOARDING_PASSES_MEMORY_ID,
  sourceMemoryId: 'memory.boarding-passes',
  label: 'The Birthday Gift — production memory',
  triggerInteractionId: BOARDING_PASSES_INTERACTION_ID,
  contentVersion: 2,
  behavior: 'replayable',
  persistence: 'completion',
  restorePolicy: 'resume-checkpoint',
  cancellationPolicy: 'allow',
  accessibilityLabel: 'Remember The Birthday Gift',
  completionFlags: ['memory.boarding-passes.shared-effort'],
  steps: [
    { id: 'acquire-memory-ownership', type: 'acquire', resources: ['interaction', 'traversal', 'camera', 'narrative-input', 'modal-ui'] },
    { id: 'settle-at-collaboration-grid', type: 'camera', position: [-21.8, 2.8, -99.5], target: [-24, 0.35, -134], durationMs: 700 },
    { id: 'volunteered-help', type: 'dialogue', speaker: 'A thoughtful surprise', text: 'You always pay attention to the things I love and the hobbies that bring me joy...' },
    { id: 'not-quick-or-easy', type: 'dialogue', speaker: 'A thoughtful surprise', text: '...like surprising me with the PS Portal for my birthday in 2026.' },
    { id: 'collaboration-stage-one', type: 'world-action', actionId: BOARDING_PASSES_WORLD_ACTION_ID, payload: { stage: 1 } },
    { id: 'hours-of-effort', type: 'dialogue', speaker: 'What remained', text: 'It is never just about the gift itself...' },
    { id: 'after-effort-introduced', type: 'checkpoint' },
    { id: 'collaboration-stage-two', type: 'world-action', actionId: BOARDING_PASSES_WORLD_ACTION_ID, payload: { stage: 2 } },
    { id: 'struggled-alone', type: 'dialogue', speaker: 'What remained', text: '...but how deeply you know me and care about what makes me smile.' },
    { id: 'help-itself', type: 'dialogue', speaker: 'What remained', text: 'That thoughtful care is something I love about you...' },
    { id: 'after-collaboration-reflection', type: 'checkpoint' },
    { id: 'collaboration-stage-three', type: 'world-action', actionId: BOARDING_PASSES_WORLD_ACTION_ID, payload: { stage: 3 } },
    { id: 'chose-the-time', type: 'dialogue', speaker: 'What remained', text: '...and it will always hold a special place in my heart.' },
    { id: 'after-completion', type: 'checkpoint' },
    { id: 'collaboration-stage-three-restore', type: 'world-action', actionId: BOARDING_PASSES_WORLD_ACTION_ID, payload: { stage: 3 } },
    { id: 'hold-completed-arrangement', type: 'wait', durationMs: 600 },
    { id: 'collaboration-clear', type: 'world-action', actionId: BOARDING_PASSES_WORLD_ACTION_ID, payload: { stage: 0 } },
    { id: 'complete-boarding-passes', type: 'complete' },
  ],
};
