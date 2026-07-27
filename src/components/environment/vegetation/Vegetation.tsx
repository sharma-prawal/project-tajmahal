import { Trees } from './Trees';
import { FlowerBeds } from './FlowerBeds';
import { PremiumGardenAssets } from './PremiumGardenAssets';
import { DenseGardenAssets } from './DenseGardenAssets';
import { Rocks } from './Rocks';
import { Shrubs } from './Shrubs';
import { StructuredGardenAccents } from './StructuredGardenAccents';
import { MausoleumFlankGardens } from './MausoleumFlankGardens';
import { GrassTufts } from './GrassTufts';
import { AXIS_LAYOUT, GARDEN } from '@constants/world';

function VegetationBoundsDiagnostic() {
  if (typeof window === 'undefined' || !new URLSearchParams(window.location.search).has('vegetationBounds')) return null;
  const centerZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.platformStart) / 2;
  const depth = Math.abs(AXIS_LAYOUT.platformStart - AXIS_LAYOUT.gardenStart) + 8;
  return <mesh position={[0, 3.5, centerZ]} renderOrder={1000}>
    <boxGeometry args={[GARDEN.usableWidth + 8, 7, depth]} />
    <meshBasicMaterial color="#ffd166" wireframe depthTest={false} />
  </mesh>;
}

/**
 * Composition root for the Phase 4E vegetation pass — populates the
 * Charbagh grounds (Phase 4D) without touching any of that phase's
 * geometry. Every child here is a small number of `InstancedMesh` draw
 * calls (one per geometry/material combination), not per-instance meshes.
 */
export function Vegetation() {
  return (
    <>
      <Trees />
      <FlowerBeds />
      <GrassTufts />
      <PremiumGardenAssets />
      <DenseGardenAssets />
      <Rocks />
      <Shrubs />
      <StructuredGardenAccents />
      <MausoleumFlankGardens />
      <VegetationBoundsDiagnostic />
    </>
  );
}
