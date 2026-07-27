import { AXIS_LAYOUT, GARDEN, MAUSOLEUM, OOB_BOUNDS, PLATFORM } from '@constants/world';
import { MINTS_ANCHOR } from '@core/memoryRuntime/mintsMemoryDefinition';
import { BACK_ANCHOR } from '@core/memoryRuntime/backMemoryDefinition';
import { UMBRELLA_ANCHOR } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { LITTLE_DETAILS_ANCHOR } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_ANCHOR } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BOARDING_PASSES_ANCHOR } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_ANCHOR } from '@core/memoryRuntime/fridayNightMemoryDefinition';

export interface LightingCaptureView {
  id: string;
  label: string;
  position: [number, number, number];
  lookAt: [number, number, number];
}

const mausoleumCenterZ = (AXIS_LAYOUT.mausoleumStart + AXIS_LAYOUT.mausoleumEnd) / 2;
const domeApexY = PLATFORM.height + MAUSOLEUM.domeApexHeight;
const gardenCenterZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;

/**
 * Fixed, deterministic world-space camera poses driven by
 * `LightingCaptureCamera` — analogous to `core/bakeoff/reviewViews.ts` but
 * over the real production world (`AXIS_LAYOUT`/`PLATFORM`/`MAUSOLEUM`/
 * `GARDEN`), not the isolated bake-off slice. Views 1-7 are the Phase 4B
 * lighting capture suite; 8-13 were added in Phase 4D for the Charbagh
 * grounds capture suite (`scripts/capture-charbagh.ts`) — same camera
 * infrastructure, no lighting-specific meaning to the added views.
 */
export const LIGHTING_CAPTURE_VIEWS: LightingCaptureView[] = [
  {
    id: 'entrance-gate',
    label: '1. Entrance gate',
    position: [0, 6, AXIS_LAYOUT.gateStart + 6],
    lookAt: [0, 4, AXIS_LAYOUT.gardenEnd],
  },
  {
    id: 'central-axis',
    label: '2. Central axis',
    position: [0, 10, AXIS_LAYOUT.gardenStart - 6],
    lookAt: [0, 8, mausoleumCenterZ],
  },
  {
    id: 'reflecting-pool',
    label: '3. Reflecting pool',
    position: [0, 4, AXIS_LAYOUT.poolStart + 4],
    lookAt: [0, 3, AXIS_LAYOUT.poolEnd],
  },
  {
    id: 'front-taj',
    label: '4. Front Taj',
    position: [0, PLATFORM.height + 6, AXIS_LAYOUT.platformStart + 12],
    lookAt: [0, PLATFORM.height + 14, mausoleumCenterZ],
  },
  {
    id: 'three-quarter',
    label: '5. Three-quarter',
    position: [-26, PLATFORM.height + 11, AXIS_LAYOUT.mausoleumStart + 16],
    lookAt: [0, PLATFORM.height + 16, mausoleumCenterZ],
  },
  {
    id: 'low-angle',
    label: '6. Low angle',
    position: [0, PLATFORM.height + 2, AXIS_LAYOUT.mausoleumStart + 8],
    lookAt: [0, domeApexY, mausoleumCenterZ],
  },
  {
    id: 'distant-silhouette',
    label: '7. Distant silhouette',
    position: [0, 14, AXIS_LAYOUT.forecourtStart + 5],
    lookAt: [0, 10, mausoleumCenterZ],
  },
  {
    id: 'entrance-plaza',
    label: '8. Entrance plaza',
    position: [0, 8, AXIS_LAYOUT.forecourtStart + 4],
    lookAt: [0, 3, AXIS_LAYOUT.gateStart],
  },
  {
    id: 'cross-axis',
    label: '9. Cross axis',
    position: [-30, 9, gardenCenterZ + 22],
    lookAt: [0, 2, gardenCenterZ],
  },
  {
    id: 'platform-stairs',
    label: '10. Platform stairs',
    position: [10, 4, AXIS_LAYOUT.platformStart + 6],
    lookAt: [0, PLATFORM.height, AXIS_LAYOUT.platformStart - 3],
  },
  {
    id: 'boundary-wall',
    label: '11. Boundary wall',
    position: [OOB_BOUNDS.maxX - 12, 3, gardenCenterZ],
    lookAt: [OOB_BOUNDS.maxX, 1.5, gardenCenterZ],
  },
  {
    id: 'aerial-overview',
    label: '12. Wide aerial overview',
    position: [0, 90, AXIS_LAYOUT.gardenStart - 20],
    lookAt: [0, 0, mausoleumCenterZ],
  },
  {
    id: 'top-down-layout',
    label: '13. Top-down layout',
    position: [0.01, 130, gardenCenterZ],
    lookAt: [0, 0, gardenCenterZ],
  },
  {
    id: 'garden-quadrant-close',
    label: '14. Garden quadrant close (Phase 4E vegetation)',
    position: [-24, 3, gardenCenterZ - 15],
    lookAt: [-24, 1, gardenCenterZ - 30],
  },
  {
    id: 'flower-bed-close',
    label: '15. Flower bed close-up',
    position: [4, 1.6, AXIS_LAYOUT.poolEnd + 3],
    lookAt: [0, 0.5, AXIS_LAYOUT.poolEnd],
  },
  {
    id: 'tree-lod-near',
    label: '16. Tree cluster — LOD near (lod0)',
    position: [0, 3, gardenCenterZ - 55],
    lookAt: [0, 2, gardenCenterZ - 60],
  },
  {
    id: 'tree-lod-far',
    label: '17. Tree cluster — LOD far (lod2)',
    position: [0, 10, gardenCenterZ + 40],
    lookAt: [0, 2, gardenCenterZ - 60],
  },
  {
    id: 'water-low-angle',
    label: '18. Reflecting pool — low water angle',
    position: [-10, 1.05, AXIS_LAYOUT.poolStart + 1.5],
    lookAt: [0, 0.15, AXIS_LAYOUT.poolEnd - 1],
  },
  {
    id: 'fountain-close',
    label: '19. Fountain water close-up',
    position: [3.8, 1.7, AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.25 + 3.4],
    lookAt: [0, 0.35, AXIS_LAYOUT.gardenStart - GARDEN.axisLength * 0.25],
  },
  {
    id: 'reflection-diagnostic',
    label: '20. Pool reflection diagnostic',
    position: [0, 2.2, AXIS_LAYOUT.poolStart + 2],
    lookAt: [0, 0.2, mausoleumCenterZ],
  },
  {
    id: 'memory-mints-composition',
    label: '21. Mints environmental framing',
    position: [MINTS_ANCHOR[0] - 7, 3.2, MINTS_ANCHOR[2] + 7],
    lookAt: [MINTS_ANCHOR[0], 0.5, MINTS_ANCHOR[2]],
  },
  {
    id: 'memory-back-composition',
    label: '22. Back environmental framing',
    position: [-5, 7, BACK_ANCHOR[2] + 16],
    lookAt: [BACK_ANCHOR[0], 1, BACK_ANCHOR[2]],
  },
  {
    id: 'memory-umbrella-composition',
    label: '23. Umbrella environmental framing',
    position: [5, 7, UMBRELLA_ANCHOR[2] + 16],
    lookAt: [UMBRELLA_ANCHOR[0], 1, UMBRELLA_ANCHOR[2]],
  },
  {
    id: 'memory-little-details-composition',
    label: '24. Little Details environmental framing',
    position: [LITTLE_DETAILS_ANCHOR[0] + 7, 3, LITTLE_DETAILS_ANCHOR[2] + 7],
    lookAt: [LITTLE_DETAILS_ANCHOR[0], 0.7, LITTLE_DETAILS_ANCHOR[2]],
  },
  {
    id: 'memory-all-day-call-composition',
    label: '25. All-Day Call environmental framing',
    position: [ALL_DAY_CALL_ANCHOR[0] - 8, 3, ALL_DAY_CALL_ANCHOR[2] + 7],
    lookAt: [ALL_DAY_CALL_ANCHOR[0], 0.7, ALL_DAY_CALL_ANCHOR[2]],
  },
  {
    id: 'memory-boarding-passes-composition',
    label: '26. Boarding Passes environmental framing',
    position: [BOARDING_PASSES_ANCHOR[0] + 8, 3, BOARDING_PASSES_ANCHOR[2] + 7],
    lookAt: [BOARDING_PASSES_ANCHOR[0], 0.7, BOARDING_PASSES_ANCHOR[2]],
  },
  {
    id: 'memory-friday-night-composition',
    label: '27. Friday Night environmental framing',
    position: [FRIDAY_NIGHT_ANCHOR[0] - 7, 3, FRIDAY_NIGHT_ANCHOR[2] + 7],
    lookAt: [FRIDAY_NIGHT_ANCHOR[0], 0.7, FRIDAY_NIGHT_ANCHOR[2]],
  },
];
