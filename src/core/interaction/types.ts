export type InteractionType = 'proximity' | 'view-and-proximity' | 'environmental';
export type InteractionPersistence = 'none' | 'completion';
export type InteractionInterruption = 'cancel-on-exit' | 'complete-on-exit' | 'ignore';
export type InteractionLifecycle =
  | 'idle'
  | 'focused'
  | 'activating'
  | 'active'
  | 'completing'
  | 'cancelled'
  | 'cooldown'
  | 'completed';

export interface InteractionContext<TPayload = unknown> {
  id: string;
  payload: TPayload;
  completedBefore: boolean;
  complete: () => boolean;
  cancel: () => boolean;
}

export interface InteractionDefinition<TPayload = unknown> {
  id: string;
  type: InteractionType;
  position: readonly [number, number, number];
  /** Spherical trigger radius in world metres. */
  activationDistance: number;
  /** Maximum camera-to-target angle in degrees; required by view-and-proximity. */
  focusAngleDegrees?: number;
  priority?: number;
  enabled?: boolean;
  behavior: 'one-shot' | 'repeatable';
  prompt: string;
  completedPrompt?: string;
  accessibilityLabel: string;
  completedAccessibilityLabel?: string;
  interruption?: InteractionInterruption;
  persistence?: InteractionPersistence;
  cooldownMs?: number;
  /** Manual completion keeps the lifecycle active for future narrative sequencing. */
  completion?: 'immediate' | 'manual';
  payload?: TPayload;
  onActivate?: (context: InteractionContext<TPayload>) => void;
}

export interface InteractionObserver {
  x: number;
  y: number;
  z: number;
  forwardX: number;
  forwardY: number;
  forwardZ: number;
  /** Accessibility multiplier, clamped by the runtime. */
  distanceScale?: number;
}

export interface InteractionCandidate {
  id: string;
  distance: number;
  alignment: number;
  priority: number;
  retained: boolean;
}

export interface InteractionPromptSnapshot {
  focusedId: string | null;
  prompt: string | null;
  accessibilityLabel: string | null;
  lifecycle: InteractionLifecycle;
  canActivate: boolean;
  completed: boolean;
}

export interface InteractionDiagnostic extends InteractionCandidate {
  eligible: boolean;
  angleEligible: boolean;
  rangeEligible: boolean;
  occlusion: 'not-evaluated';
  persisted: boolean;
}

export interface InteractionLifecycleEvent {
  id: string | null;
  from: InteractionLifecycle;
  to: InteractionLifecycle;
  reason: string;
  at: number;
}
