import { AXIS_LAYOUT } from './world';

/** Shared production placement for the Taj, its gate, collision and finale. */
const TAJ_REFERENCE_FOOTPRINT = 36;
const TAJ_REFERENCE_BASE_TOP_Y = 2.7;

/**
 * Match the 48 m chabutra footprint used by the approved world layout. The
 * downloaded asset already contains that marble base, so this enlarges the
 * complete authored monument instead of restoring a separate platform mesh.
 */
export const TAJ_PRESENTATION_FOOTPRINT = 48;
export const TAJ_PRESENTATION_SCALE = TAJ_PRESENTATION_FOOTPRINT / TAJ_REFERENCE_FOOTPRINT;
/**
 * Measured from the production GLB after its whole-scene centering and scale.
 * The floor/minarets define the 48 m presentation footprint; the central tomb
 * occupies only this inset square. Collision must follow the tomb, otherwise
 * broad proxies create invisible walls across the walkable marble terrace.
 */
const TAJ_MODEL_FOOTPRINT = 20.029282569885254;
const TAJ_MODEL_CENTRAL_SIZE = 11.210575103759766;
const TAJ_MODEL_CENTER_X = 0.02456045150756836;
const TAJ_MODEL_CENTER_Z = 0.33026933670043945;
export const TAJ_CENTRAL_STRUCTURE_SIZE = TAJ_PRESENTATION_FOOTPRINT * TAJ_MODEL_CENTRAL_SIZE / TAJ_MODEL_FOOTPRINT;
export const TAJ_CENTRAL_STRUCTURE_CENTER_X = -TAJ_PRESENTATION_FOOTPRINT * TAJ_MODEL_CENTER_X / TAJ_MODEL_FOOTPRINT;
export const TAJ_CENTRAL_STRUCTURE_CENTER_Z = -TAJ_PRESENTATION_FOOTPRINT * TAJ_MODEL_CENTER_Z / TAJ_MODEL_FOOTPRINT;
const TAJ_MODEL_MINARET_RADIUS = 0.65;
const TAJ_MODEL_MINARET_CENTER_X = 8.716;
const TAJ_MODEL_MINARET_FRONT_Z = 8.718;
const TAJ_MODEL_MINARET_REAR_Z = -8.751;
export const TAJ_MINARET_RADIUS = TAJ_PRESENTATION_FOOTPRINT * TAJ_MODEL_MINARET_RADIUS / TAJ_MODEL_FOOTPRINT;
export const TAJ_MINARET_CENTER_X = TAJ_PRESENTATION_FOOTPRINT * (TAJ_MODEL_MINARET_CENTER_X - TAJ_MODEL_CENTER_X) / TAJ_MODEL_FOOTPRINT;
export const TAJ_MINARET_FRONT_Z = TAJ_PRESENTATION_FOOTPRINT * (TAJ_MODEL_MINARET_FRONT_Z - TAJ_MODEL_CENTER_Z) / TAJ_MODEL_FOOTPRINT;
export const TAJ_MINARET_REAR_Z = TAJ_PRESENTATION_FOOTPRINT * (TAJ_MODEL_MINARET_REAR_Z - TAJ_MODEL_CENTER_Z) / TAJ_MODEL_FOOTPRINT;
export const TAJ_PLATFORM_CENTER_Z = (AXIS_LAYOUT.stairsEnd + AXIS_LAYOUT.platformEnd) / 2;
export const TAJ_CENTER_Z = TAJ_PLATFORM_CENTER_Z - 1.3;
export const TAJ_FRONT_Z = TAJ_CENTER_Z + TAJ_PRESENTATION_FOOTPRINT / 2 - 0.15;
/** World Z of the visible finale doors mounted on the authored Taj base. */
export const TAJ_MAIN_DOOR_Z = TAJ_CENTER_Z + TAJ_CENTRAL_STRUCTURE_CENTER_Z + TAJ_CENTRAL_STRUCTURE_SIZE / 2;
/** Exterior interaction point, leaving capsule clearance in front of the permanent door collider. */
export const TAJ_MAIN_DOOR_APPROACH_Z = TAJ_MAIN_DOOR_Z + 1.2;
/**
 * The production Taj asset includes its own marble base. It is planted on the
 * site datum rather than lifted onto the old procedural greybox plinth.
 */
export const TAJ_PLATFORM_Y = 0;
/** Measured height of the white marble base authored into the Taj GLB. */
export const TAJ_AUTHORED_BASE_TOP_Y = TAJ_REFERENCE_BASE_TOP_Y * TAJ_PRESENTATION_SCALE;
/**
 * Measured world-space bounds of the two stair flights authored into the GLB.
 * Both occupy the shallow front band and climb laterally from the outer edges
 * toward the centre landing; they do not run north/south from the garden axis.
 */
export const TAJ_AUTHORED_STAIR_INNER_X = 2.2;
export const TAJ_AUTHORED_STAIR_OUTER_X = 5.4;
export const TAJ_AUTHORED_STAIR_APPROACH_X = 6.6;
export const TAJ_AUTHORED_STAIR_DEPTH = 2.9;
export const TAJ_AUTHORED_STAIR_CENTER_Z = TAJ_FRONT_Z - TAJ_AUTHORED_STAIR_DEPTH / 2;
/** The ceremonial path ends at the front edge; visitors turn left or right to ascend. */
export const TAJ_APPROACH_FOOT_Z = TAJ_FRONT_Z + 0.4;
export const TAJ_CHAMBER_Z = TAJ_CENTER_Z - 1.8 * TAJ_PRESENTATION_SCALE;
export const TAJ_LETTER_PLINTH_Z = TAJ_CENTER_Z - 4.4 * TAJ_PRESENTATION_SCALE;
export const TAJ_AUDIO_NARROW_Z = TAJ_FRONT_Z + 2.8;
