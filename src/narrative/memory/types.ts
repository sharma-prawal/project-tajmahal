/**
 * Shared memory architecture (docs/phase-2/04-memory-system.md). All seven
 * memories are instances of ONE data-driven system — a `MemoryDefinition`
 * fed through the shared state machine (`stateMachine.ts`). Phase 3A ships
 * this architecture with placeholder mechanics/content; final interaction
 * effects are out of scope here (Part 13's Phase 3A hard constraints).
 */

export type MemoryId = 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'm6' | 'm7';

export const MEMORY_IDS: MemoryId[] = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];

/** idle -> cued -> engaged -> revealing -> complete, with cancel returning cued/engaged to idle. */
export type MemoryPhase = 'idle' | 'cued' | 'engaged' | 'revealing' | 'complete';

/**
 * Every phase, for exhaustive iteration. The landmark system's four-state
 * visual language is asserted against this list, so a new phase added to the
 * type without a matching landmark treatment fails a test instead of silently
 * rendering as whatever the switch falls through to.
 */
export const MEMORY_PHASES: MemoryPhase[] = ['idle', 'cued', 'engaged', 'revealing', 'complete'];

export type MemoryEvent = 'cue' | 'engage' | 'cancel' | 'reveal' | 'complete';

export type InteractionStrategy =
  | 'dwell' // M1: stand still in a volume
  | 'orbitCone' // M2: forgiving look/orbit cone + dwell
  | 'reflectionGaze' // M3: gaze into the reflection
  | 'spatialAudio' // M4: enter + follow sound to a focal point
  | 'diorama' // M5: approach + dwell near a primitive diorama
  | 'proximityReveal' // M6: walk toward a non-colliding reveal volume
  | 'ceremonialConfirm'; // M7: one confirm input, always succeeds

export interface MemoryDefinition {
  id: MemoryId;
  title: string;
  /** World-space placement (greybox coordinates), and a generous discovery/engage radius (Part 3/4: "generous progression volumes"). */
  location: { x: number; y: number; z: number };
  discoveryRadius: number;
  interactionStrategy: InteractionStrategy;
  /** Placeholder reveal duration in seconds — final timelines are content, not architecture. */
  revealDurationSeconds: number;
  /** One-line description of the persistent world change on completion (placeholder, not implemented visually beyond a primitive marker). */
  completionWorldEffect: string;
  /** What happens if the player leaves mid-interaction — must return to idle with no partial effect. */
  cancellationBehavior: string;
  cameraPolicy: 'none' | 'subtleBias';
  desktopInput: string;
  touchInput: string;
  accessibilityFallback: string;
  reducedMotionFallback: string;
  /**
   * 'unmissable' memories (M3/M6/M7) sit on the mandatory route with a
   * generous discovery volume so a forward-only player always completes
   * them — the door's "recovery trigger" for these three is placement
   * itself: their discovery volumes span the walkable width of the route
   * at that point, so passing through the zone re-cues them if not yet
   * engaged (Part 3/4). 'optional' memories require the player to detour.
   */
  classification: 'unmissable' | 'optional';
}
