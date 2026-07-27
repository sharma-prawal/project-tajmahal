import { AXIS_LAYOUT, GARDEN, PAVILION, PLATFORM, POOL } from '@constants/world';
import { TAJ_AUTHORED_BASE_TOP_Y, TAJ_MAIN_DOOR_APPROACH_Z } from '@constants/tajPlacement';
import type { MemoryDefinition } from './types';

const gardenFirstHalfZ = AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.28;
const gardenSecondHalfZ = AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.72;
const quadrantOffsetX = GARDEN.usableWidth / 4;
const poolZ = (AXIS_LAYOUT.poolStart + AXIS_LAYOUT.poolEnd) / 2;
const pavilionZ = (AXIS_LAYOUT.approachStart + AXIS_LAYOUT.approachEnd) / 2;
// M6/M7 now sit on the site datum. The production Taj includes its own base;
// the separate procedural platform and its 3.2 m vertical offset were removed.
const platformEdgeZ = AXIS_LAYOUT.stairsEnd - 1;
// M7 shares the established exterior main-door interaction point. The solid
// facade blocker prevents its generous radius from becoming an interior route.
const landingZ = TAJ_MAIN_DOOR_APPROACH_Z;
const platformSurfaceY = 1.5;
const tajMemoryY = TAJ_AUTHORED_BASE_TOP_Y + 1.5;

/**
 * Placeholder placements + mechanics for the seven memories
 * (docs/phase-2/04-memory-system.md). Content (text, audio, final visuals)
 * is intentionally not implemented — Phase 3A ships the shared architecture
 * and primitive greybox volumes only.
 */
export const MEMORY_DEFINITIONS: MemoryDefinition[] = [
  {
    id: 'm1',
    title: 'Petal message (placeholder)',
    location: { x: -quadrantOffsetX, y: 1.2, z: gardenFirstHalfZ },
    discoveryRadius: 4,
    interactionStrategy: 'dwell',
    revealDurationSeconds: 3,
    completionWorldEffect: 'NW quadrant petal-fall becomes permanent (placeholder: primitive colour change).',
    cancellationBehavior: 'Leaving the volume before reveal returns to cued with no effect.',
    cameraPolicy: 'none',
    desktopInput: 'Stay within the volume (no click needed).',
    touchInput: 'Stay within the volume.',
    accessibilityFallback: 'Dwell-only, no precision required.',
    reducedMotionFallback: 'Skips animated petal framing, shows the placeholder marker directly.',
    classification: 'optional',
  },
  {
    id: 'm2',
    title: 'Interactive object (placeholder)',
    location: { x: -quadrantOffsetX, y: 1, z: gardenSecondHalfZ },
    discoveryRadius: 4,
    interactionStrategy: 'orbitCone',
    revealDurationSeconds: 3,
    completionWorldEffect: 'Fireflies persist in the SW quadrant (placeholder: primitive glow).',
    cancellationBehavior: 'Walking away resets to cued.',
    cameraPolicy: 'subtleBias',
    desktopInput: 'Look toward the object from a reasonable angle for a short dwell.',
    touchInput: 'Drag to orbit / tap-and-hold near the object.',
    accessibilityFallback: 'Generous cone + dwell — no exact angle required.',
    reducedMotionFallback: 'Reveal happens without any spin/rotation cue.',
    classification: 'optional',
  },
  {
    id: 'm3',
    title: 'Reflection transformation (placeholder)',
    location: { x: 0, y: 0.3, z: poolZ },
    discoveryRadius: Math.max(POOL.width, POOL.depth) / 2 + 6,
    interactionStrategy: 'reflectionGaze',
    revealDurationSeconds: 4,
    completionWorldEffect: 'Pool becomes perfectly mirror-still (placeholder: primitive colour change).',
    cancellationBehavior: 'Looking away pauses; returns without side effects until complete.',
    cameraPolicy: 'subtleBias',
    desktopInput: 'Look down/toward the reflection and dwell.',
    touchInput: 'Same — look toward the water and dwell.',
    accessibilityFallback: 'Dwell-only.',
    reducedMotionFallback: 'Shorter, gentler crossfade instead of an animated swap.',
    classification: 'unmissable',
  },
  {
    id: 'm4',
    title: 'Sound memory (placeholder)',
    location: { x: -(PAVILION.axisOffset - PAVILION.width / 2 - 1.8), y: 1, z: pavilionZ },
    discoveryRadius: 5,
    interactionStrategy: 'spatialAudio',
    revealDurationSeconds: 5,
    completionWorldEffect: 'A lantern on the west pavilion lights and stays lit (placeholder: primitive glow).',
    cancellationBehavior: 'Leaving the pavilion before completion returns to cued.',
    cameraPolicy: 'none',
    desktopInput: 'Walk to the focal point at the pavilion threshold.',
    touchInput: 'Same — walk to the focal point.',
    accessibilityFallback: 'Visual completion path (light-shaft pulse) works even with audio muted/failed.',
    reducedMotionFallback: 'Steadier light pulse, no animated flicker.',
    classification: 'optional',
  },
  {
    id: 'm5',
    title: 'Miniature diorama (placeholder)',
    location: { x: PAVILION.axisOffset - PAVILION.width / 2 - 1.8, y: 1, z: pavilionZ },
    discoveryRadius: 4,
    interactionStrategy: 'diorama',
    revealDurationSeconds: 3,
    completionWorldEffect: 'East pavilion gains a warm lantern (placeholder: primitive glow).',
    cancellationBehavior: 'Leaving resets to cued.',
    cameraPolicy: 'none',
    desktopInput: 'Approach and dwell near the diorama.',
    touchInput: 'Same — approach and dwell.',
    accessibilityFallback: 'Forgiving dwell, like M2.',
    reducedMotionFallback: 'No depth-of-field effect — never required for completion.',
    classification: 'optional',
  },
  {
    id: 'm6',
    title: 'Environmental reconstruction (placeholder)',
    location: { x: 0, y: platformSurfaceY, z: platformEdgeZ },
    discoveryRadius: PLATFORM.width / 2,
    interactionStrategy: 'proximityReveal',
    revealDurationSeconds: 4,
    completionWorldEffect: 'Heavier golden petal-fall begins across the platform (placeholder: primitive colour change).',
    cancellationBehavior: 'Leaving the volume dissolves the shell with no effect.',
    cameraPolicy: 'none',
    desktopInput: 'Walk toward the reveal volume on the platform edge.',
    touchInput: 'Same — walk toward the volume.',
    accessibilityFallback: 'Proximity-only, no input precision required.',
    reducedMotionFallback: 'Shell fades in/out instead of particle-assembling.',
    classification: 'unmissable',
  },
  {
    id: 'm7',
    title: 'Lights forming a message (placeholder)',
    location: { x: 0, y: tajMemoryY, z: landingZ },
    discoveryRadius: 4.5,
    interactionStrategy: 'ceremonialConfirm',
    revealDurationSeconds: 2,
    completionWorldEffect: "Door's inner glow ignites; garden lanterns light in sequence (placeholder: primitive colour change).",
    cancellationBehavior: 'May be re-approached freely; idempotent, no penalty.',
    cameraPolicy: 'subtleBias',
    desktopInput: 'One confirm input (key press) with a generous target and no timing.',
    touchInput: 'One confirm input (tap) with a generous target and no timing.',
    accessibilityFallback: 'Single generous-target input, always succeeds — a rite, not a puzzle.',
    reducedMotionFallback: 'Lights settle directly without choreographed motion.',
    classification: 'unmissable',
  },
];

/** The mausoleum door is the reward after the seventh, Taj-bound memory. */
export const DOOR_UNLOCK_THRESHOLD = 7;
