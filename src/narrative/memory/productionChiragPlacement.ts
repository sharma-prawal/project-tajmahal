import { ALL_DAY_CALL_ANCHOR, ALL_DAY_CALL_MEMORY_ID } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BACK_ANCHOR, BACK_MEMORY_ID } from '@core/memoryRuntime/backMemoryDefinition';
import { BOARDING_PASSES_ANCHOR, BOARDING_PASSES_MEMORY_ID } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_ANCHOR, FRIDAY_NIGHT_MEMORY_ID } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { LITTLE_DETAILS_ANCHOR, LITTLE_DETAILS_MEMORY_ID } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { MINTS_ANCHOR, MINTS_MEMORY_ID } from '@core/memoryRuntime/mintsMemoryDefinition';
import { UMBRELLA_ANCHOR, UMBRELLA_MEMORY_ID } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { TAJ_AUTHORED_BASE_TOP_Y } from '@constants/tajPlacement';

export interface ProductionChiragPlacement {
  productionMemoryId: string;
  position: readonly [number, number, number];
  rotationY: number;
}

/** One guide lamp beside every production memory, in canonical journey order. */
export const PRODUCTION_CHIRAG_PLACEMENTS: readonly ProductionChiragPlacement[] = [
  { productionMemoryId: MINTS_MEMORY_ID, position: [MINTS_ANCHOR[0] - 2.2, 0, MINTS_ANCHOR[2]], rotationY: Math.PI / 2 },
  { productionMemoryId: BOARDING_PASSES_MEMORY_ID, position: [BOARDING_PASSES_ANCHOR[0] - 2.6, 0, BOARDING_PASSES_ANCHOR[2]], rotationY: Math.PI / 2 },
  { productionMemoryId: LITTLE_DETAILS_MEMORY_ID, position: [LITTLE_DETAILS_ANCHOR[0] + 2.5, 0, LITTLE_DETAILS_ANCHOR[2]], rotationY: -Math.PI / 2 },
  { productionMemoryId: BACK_MEMORY_ID, position: [BACK_ANCHOR[0] + 2.2, 0, BACK_ANCHOR[2] + 1.2], rotationY: Math.PI / 2 },
  { productionMemoryId: UMBRELLA_MEMORY_ID, position: [UMBRELLA_ANCHOR[0] - 2.2, 0, UMBRELLA_ANCHOR[2] + 1.2], rotationY: -Math.PI / 2 },
  { productionMemoryId: FRIDAY_NIGHT_MEMORY_ID, position: [FRIDAY_NIGHT_ANCHOR[0] + 2.5, 0, FRIDAY_NIGHT_ANCHOR[2] + 1], rotationY: Math.PI / 2 },
  // The final guide stands beside its memory on the exterior marble landing.
  { productionMemoryId: ALL_DAY_CALL_MEMORY_ID, position: [ALL_DAY_CALL_ANCHOR[0] - 1.2, TAJ_AUTHORED_BASE_TOP_Y, ALL_DAY_CALL_ANCHOR[2] + 0.4], rotationY: Math.PI / 2 },
];