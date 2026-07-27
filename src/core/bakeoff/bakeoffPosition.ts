import { OOB_BOUNDS } from '@constants/world';

/**
 * Where the bake-off slice sits in the world — well outside the greybox's
 * boundary walls (Part 3), so it is never reachable by walking the normal
 * route. Purely a positioned validation artifact for the six-view review,
 * not part of the walkthrough.
 */
export const BAKEOFF_SLICE_POSITION: [number, number, number] = [OOB_BOUNDS.maxX + 40, 0, -10];
