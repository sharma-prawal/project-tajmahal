import { useEffect, useMemo } from 'react';
import { Instance } from '@react-three/drei';
import { DoubleSide } from 'three';
import {
  createLandmarkBandGeometry,
  createLandmarkFlameGeometry,
  createLandmarkPillarGeometry,
  createLandmarkRingGeometry,
} from './landmarkGeometry';
import { PRODUCTION_CHIRAG_PLACEMENTS } from './productionChiragPlacement';
import { landmarkVisualFor } from './landmarkState';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { useMemoryRuntimeCompletedCount, useMemoryRuntimeSnapshot } from '@core/memoryRuntime/useMemoryRuntimeSnapshot';
import { CulledInstances } from '@components/environment/vegetation/CulledInstances';
import type { MemoryPhase } from './types';

/**
 * Phase 10D.1 — the memory landmark system.
 *
 * Replaces seven untextured grey spheres. The state machine, the discovery
 * volumes, the save format and the door-unlock rule are all untouched — this
 * reads `useMemoryStore` and draws, nothing more.
 *
 * **Cost: three instanced draw calls for all ten lamps**, plus one more for a
 * few seconds while a memory is revealing. The marble is one merged geometry;
 * the inlay ring and the flame are unlit materials with per-instance vertex
 * colours, which is what lets ten lamps in four different states share a draw
 * call (three has no per-instance emissive — see `landmarkState.ts`).
 *
 * No lights are added. A `PointLight` per lamp would have been the obvious way
 * to sell a flame and would also have been ten more shadow-casting lights in a
 * scene whose lighting is explicitly out of scope this phase.
 *
 * Uses `CulledInstances`, not drei's `Instances` directly, and that is not
 * cosmetic: drei derives the culling sphere from the *base* geometry, centred
 * on the origin, ignoring where the instances actually are. These ten lamps
 * are spread over 147 m of world, so with a raw `Instances` the whole set
 * vanished whenever the camera was not pointed near the world origin — which
 * is most of the time. `CulledInstances` recomputes the aggregate bounds after
 * drei commits the instance matrices.
 */
export function MemoryLandmarks() {
  const snapshot = useMemoryRuntimeSnapshot();
  useMemoryRuntimeCompletedCount();

  const pillar = useMemo(() => createLandmarkPillarGeometry(), []);
  const ring = useMemo(() => createLandmarkRingGeometry(), []);
  const band = useMemo(() => createLandmarkBandGeometry(), []);
  const flame = useMemo(() => createLandmarkFlameGeometry(), []);
  useEffect(() => () => { pillar.dispose(); ring.dispose(); band.dispose(); flame.dispose(); }, [pillar, ring, band, flame]);

  const completed = new Set(memoryRuntime.getCompletedIds());
  const visuals = PRODUCTION_CHIRAG_PLACEMENTS.map((placement) => {
    const phase: MemoryPhase = snapshot.activeMemoryId === placement.productionMemoryId
      ? 'revealing'
      : completed.has(placement.productionMemoryId)
        ? 'complete'
        : 'idle';
    return landmarkVisualFor(phase);
  });

  return (
    <group name="memory-landmarks">
      <CulledInstances range={PRODUCTION_CHIRAG_PLACEMENTS.length} castShadow receiveShadow>
        <primitive object={pillar} attach="geometry" />
        {/* The garden's own marble, so the lamps read as original fittings. */}
        <meshStandardMaterial color="#e2d9c6" roughness={0.62} metalness={0} />
        {PRODUCTION_CHIRAG_PLACEMENTS.map((placement, index) => (
          <Instance key={index} position={placement.position} rotation={[0, placement.rotationY, 0]} />
        ))}
      </CulledInstances>

      <CulledInstances range={PRODUCTION_CHIRAG_PLACEMENTS.length}>
        <primitive object={ring} attach="geometry" />
        <meshBasicMaterial vertexColors toneMapped />
        {PRODUCTION_CHIRAG_PLACEMENTS.map((placement, index) => (
          <Instance
            key={index}
            position={placement.position}
            rotation={[0, placement.rotationY, 0]}
            color={visuals[index].ringColor}
          />
        ))}
      </CulledInstances>

      {/* Phase 10E.1 vertical state band — the cue that survives to 20 m. */}
      <CulledInstances range={PRODUCTION_CHIRAG_PLACEMENTS.length}>
        <primitive object={band} attach="geometry" />
        <meshBasicMaterial vertexColors toneMapped side={DoubleSide} />
        {PRODUCTION_CHIRAG_PLACEMENTS.map((placement, index) => (
          <Instance
            key={index}
            position={placement.position}
            rotation={[0, placement.rotationY, 0]}
            color={visuals[index].ringColor}
          />
        ))}
      </CulledInstances>

      <group>
        <CulledInstances range={PRODUCTION_CHIRAG_PLACEMENTS.length}>
          <primitive object={flame} attach="geometry" />
          <meshBasicMaterial vertexColors toneMapped />
          {PRODUCTION_CHIRAG_PLACEMENTS.map((placement, index) => (
            <Instance
              key={index}
              position={placement.position}
              rotation={[0, placement.rotationY, 0]}
              scale={visuals[index].flameScale}
              color={visuals[index].flameColor}
            />
          ))}
        </CulledInstances>
      </group>
    </group>
  );
}
