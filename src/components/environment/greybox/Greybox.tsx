import { Terrain } from './Terrain';
import { GroundZones } from './GroundZones';
import { Boundaries } from './Boundaries';
import { EntranceGate } from './EntranceGate';
import { GardenDressing } from './GardenDressing';
import { Pathways } from './Pathways';
import { Fountains } from './Fountains';
import { ReflectingPool } from './ReflectingPool';
import { Pavilions } from './Pavilions';
import { MausoleumBlockIn } from './MausoleumBlockIn';
import { InteriorChamber } from './InteriorChamber';
import { ReviewMarkers } from './ReviewMarkers';
import { Vegetation } from '../vegetation/Vegetation';
import { ArchitecturalDetails } from './ArchitecturalDetails';
import { TajApproachStairs } from './TajApproachStairs';

/**
 * Composition root for the world's architectural grounds. Stage 1's
 * primitive greybox (Part 3) is now partially replaced by Phase 4D's
 * production Charbagh grounds (`Pathways`, `Fountains`, and updated
 * materials on the remaining components — see
 * docs/phase-4/charbagh-grounds.md) and Phase 4E's vegetation pass
 * (`Vegetation` — see docs/phase-4/vegetation.md); geometry stays
 * primitive-based throughout (no new mesh library, no textures downloaded
 * this phase), only materials and ground/landscape detail moved from
 * placeholder to production.
 */
export function Greybox() {
  return (
    <>
      <Terrain />
      <GroundZones />
      <Boundaries />
      <EntranceGate />
      <GardenDressing />
      <Pathways />
      <ArchitecturalDetails />
      <Fountains />
      <ReflectingPool />
      <Pavilions />
      <MausoleumBlockIn />
      <TajApproachStairs />
      <InteriorChamber />
      <Vegetation />
      <ReviewMarkers />
    </>
  );
}
