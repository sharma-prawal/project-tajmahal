export type MemoryRuntimeLifecycle = 'idle' | 'preparing' | 'active' | 'awaiting-input' | 'suspended' | 'cancelling' | 'completing' | 'completed' | 'failed';
export type OwnershipResource = 'traversal' | 'camera' | 'interaction' | 'narrative-input' | 'modal-ui';
export type MemoryRestorePolicy = 'resume-checkpoint' | 'restart' | 'cancel-on-reload';

export type MemoryStep =
  | { id: string; type: 'acquire'; resources: OwnershipResource[] }
  | { id: string; type: 'release'; resources: OwnershipResource[] }
  | { id: string; type: 'dialogue'; speaker: string; text: string; continueLabel?: string; presentation?: 'standard' | 'emphasis' }
  | { id: string; type: 'wait'; durationMs: number }
  | { id: string; type: 'camera'; target: readonly [number, number, number]; position: readonly [number, number, number]; durationMs: number; hold?: boolean }
  | { id: string; type: 'world-action'; actionId: string; payload?: unknown }
  | { id: string; type: 'checkpoint' }
  | { id: string; type: 'complete' }
  | { id: string; type: 'cancel'; reason: string };

export interface RuntimeMemoryDefinition {
  id: string;
  sourceMemoryId?: string;
  label: string;
  triggerInteractionId: string;
  contentVersion: number;
  behavior: 'one-shot' | 'replayable';
  persistence: 'completion' | 'none';
  restorePolicy: MemoryRestorePolicy;
  prerequisiteIds?: string[];
  completionFlags?: string[];
  cancellationPolicy: 'allow' | 'deny';
  accessibilityLabel: string;
  developmentTags?: string[];
  steps: MemoryStep[];
}

export interface DialogueSnapshot { speaker: string; text: string; continueLabel: string; presentation: 'standard' | 'emphasis'; }
export interface RuntimeSnapshot {
  activeMemoryId: string | null;
  lifecycle: MemoryRuntimeLifecycle;
  stepId: string | null;
  stepIndex: number;
  stepElapsedMs: number;
  dialogue: DialogueSnapshot | null;
  pendingInput: boolean;
  cancellationReason: string | null;
  error: string | null;
  checkpointStepId: string | null;
}

export interface PersistedMemoryCheckpoint { memoryId: string; contentVersion: number; stepId: string; }
