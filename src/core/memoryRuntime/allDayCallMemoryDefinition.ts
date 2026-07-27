import { TAJ_AUTHORED_BASE_TOP_Y, TAJ_MAIN_DOOR_APPROACH_Z } from '@constants/tajPlacement';
import type { RuntimeMemoryDefinition } from './types';

export const ALL_DAY_CALL_MEMORY_ID = 'production.memory.all-day-call';
export const ALL_DAY_CALL_INTERACTION_ID = 'interaction.memory.all-day-call';
export const ALL_DAY_CALL_WORLD_ACTION_ID = 'memory.all-day-call.set-path-cadence-stage';
export const ALL_DAY_CALL_CADENCE_BAR_SIZE = [1.4, .035, .3] as const;
export const ALL_DAY_CALL_ANCHOR = [0, TAJ_AUTHORED_BASE_TOP_Y + 0.02, TAJ_MAIN_DOOR_APPROACH_Z] as const;
export const ALL_DAY_CALL_ACTIVATION_DISTANCE = 6.2;

export const ALL_DAY_CALL_MEMORY: RuntimeMemoryDefinition = {
  id: ALL_DAY_CALL_MEMORY_ID,
  sourceMemoryId: 'memory.all-day-call',
  label: 'Through Every Emotion — production memory',
  triggerInteractionId: ALL_DAY_CALL_INTERACTION_ID,
  contentVersion: 2,
  behavior: 'replayable',
  persistence: 'completion',
  restorePolicy: 'resume-checkpoint',
  cancellationPolicy: 'allow',
  accessibilityLabel: 'Remember Through Every Emotion',
  completionFlags: ['memory.all-day-call.quiet-presence'],
  steps: [
    { id: 'acquire-memory-ownership', type: 'acquire', resources: ['interaction', 'traversal', 'camera', 'narrative-input', 'modal-ui'] },
    {
      id: 'settle-along-walkway',
      type: 'camera',
      position: [-5.6, TAJ_AUTHORED_BASE_TOP_Y + 2.8, ALL_DAY_CALL_ANCHOR[2] + 5.5],
      target: [0, TAJ_AUTHORED_BASE_TOP_Y + 0.35, ALL_DAY_CALL_ANCHOR[2]],
      durationMs: 700,
    },
    { id: 'unspoken-feeling', type: 'dialogue', speaker: 'A quiet devotion', text: 'Even on days when you feel sad or moody and things feel difficult…' },
    { id: 'not-in-words', type: 'dialogue', speaker: 'A quiet devotion', text: '…the effort you make to listen, understand, and stay close to me is remarkable.' },
    { id: 'after-first-reflection', type: 'checkpoint' },
    { id: 'cadence-stage-one', type: 'world-action', actionId: ALL_DAY_CALL_WORLD_ACTION_ID, payload: { stage: 1 } },
    { id: 'chose-to-stay', type: 'dialogue', speaker: 'What remained', text: 'I must have done something truly wonderful in a past life…' },
    { id: 'cadence-stage-two', type: 'world-action', actionId: ALL_DAY_CALL_WORLD_ACTION_ID, payload: { stage: 2 } },
    { id: 'entire-day', type: 'dialogue', speaker: 'What remained', text: '…to be blessed with someone as caring and devoted as you.' },
    { id: 'after-duration', type: 'checkpoint' },
    { id: 'cadence-stage-three', type: 'world-action', actionId: ALL_DAY_CALL_WORLD_ACTION_ID, payload: { stage: 3 } },
    { id: 'quiet-choice', type: 'dialogue', speaker: 'What remained', text: 'Your presence in my life is a gift I will cherish forever.' },
    { id: 'after-final-reflection', type: 'checkpoint' },
    { id: 'cadence-stage-three-restore', type: 'world-action', actionId: ALL_DAY_CALL_WORLD_ACTION_ID, payload: { stage: 3 } },
    { id: 'hold-after-final-reflection', type: 'wait', durationMs: 600 },
    { id: 'cadence-clear', type: 'world-action', actionId: ALL_DAY_CALL_WORLD_ACTION_ID, payload: { stage: 0 } },
    { id: 'complete-all-day-call', type: 'complete' },
  ],
};
