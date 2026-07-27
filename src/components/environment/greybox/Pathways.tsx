import { useEffect, useMemo } from 'react';
import { AXIS_LAYOUT, GARDEN, PAVILION, POOL } from '@constants/world';
import { GROUND_MATERIAL } from '@constants/groundMaterials';
import {
  TAJ_APPROACH_FOOT_Z,
} from '@constants/tajPlacement';
import {
  makeGroundMaterial,
  useGroundTextureSets,
} from '@core/environment/useGroundSurfaces';

const gardenCenterZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
const mainAxisStartZ = AXIS_LAYOUT.forecourtStart;
const marbleAxisEndZ = AXIS_LAYOUT.poolEnd;
const marbleAxisLength = Math.abs(marbleAxisEndZ - mainAxisStartZ);
const marbleAxisCenterZ = (mainAxisStartZ + marbleAxisEndZ) / 2;
const finalApproachLength = Math.abs(TAJ_APPROACH_FOOT_Z - marbleAxisEndZ);
const finalApproachCenterZ = (marbleAxisEndZ + TAJ_APPROACH_FOOT_Z) / 2;
const pavilionZ = (AXIS_LAYOUT.approachStart + AXIS_LAYOUT.approachEnd) / 2;
const pavilionInnerEdgeX = PAVILION.axisOffset - PAVILION.width / 2 + 0.55;
const pavilionSpurLength = pavilionInnerEdgeX - GARDEN.mainPathWidth / 2;
const pavilionSpurCenterX = GARDEN.mainPathWidth / 2 + pavilionSpurLength / 2;
const pavilionWalkWidth = 2.8;
const pavilionCourtRadius = PAVILION.width / 2 + 0.8;
const poolCenterZ = (AXIS_LAYOUT.poolStart + AXIS_LAYOUT.poolEnd) / 2;
const poolThresholdDepth = 2.4;

const crossAxisWidth = GARDEN.usableWidth;
const sidePathX = GARDEN.usableWidth / 2 - GARDEN.quadrantPathWidth / 2;
const sidePathLength = GARDEN.axisLength;

const curbVisibleHeight = 0.038;
const curbEmbedDepth = 0.04;
const curbHeight = curbVisibleHeight + curbEmbedDepth;
const curbCenterY = (curbVisibleHeight - curbEmbedDepth) / 2;
const curbWidth = 0.15;
const gardenWalkX = (GARDEN.channelWidth + GARDEN.mainPathWidth) / 2;

/**
 * Production paved circulation network for the Charbagh (Phase 4D):
 * main north-south axis, one east-west cross-axis at the garden's centre,
 * and two side perimeter walkways bounding the four quadrants — all built
 * from `GARDEN.mainPathWidth`/`quadrantPathWidth` (Part 2's own reviewed
 * dimensions, not new numbers). Marble curb edging runs along the main
 * and cross axes only (the two most legible "you are meant to walk here"
 * lines); side paths stay curb-free to avoid visual clutter, per this
 * phase's "avoid unnecessary decorative detail" goal.
 *
 * Walkable, no dedicated collider — like `GardenDressing`, this rides on
 * top of the shared `Terrain` collider (Part 3 precedent: thin ground
 * dressing under ~0.1m doesn't need its own physics).
 */
export function Pathways() {
  const { gravel } = useGroundTextureSets();
  const paving = useMemo(() => ({
    approach: makeGroundMaterial(gravel, {
      tint: '#b9ad98',
      repeat: [1.4, 8],
      roughness: 0.78,
      normalScale: 0.48,
      envMapIntensity: 0.42,
      anisotropy: 8,
    }),
    spur: makeGroundMaterial(gravel, {
      tint: '#b4aa99',
      repeat: [8, 1.2],
      roughness: 0.82,
      normalScale: 0.5,
      envMapIntensity: 0.38,
      anisotropy: 8,
    }),
    court: makeGroundMaterial(gravel, {
      tint: '#c0b5a1',
      repeat: 4,
      roughness: 0.76,
      normalScale: 0.42,
      envMapIntensity: 0.44,
      anisotropy: 8,
    }),
  }), [gravel]);
  useEffect(() => () => Object.values(paving).forEach((material) => {
    material.map?.dispose();
    material.normalMap?.dispose();
    material.roughnessMap?.dispose();
    material.dispose();
  }), [paving]);

  return (
    <>
      {/* Twin marble walks flank the central rill without covering its water. */}
      {[-1, 1].map((side) => (
        <group key={`garden-walk-${side}`}>
          <mesh position={[side * gardenWalkX, 0.008, marbleAxisCenterZ]} receiveShadow>
            <boxGeometry args={[GARDEN.mainPathWidth, 0.016, marbleAxisLength]} />
            <meshStandardMaterial {...GROUND_MATERIAL.marble} />
          </mesh>
          <mesh
            position={[side * (gardenWalkX + GARDEN.mainPathWidth / 2 + curbWidth / 2), curbCenterY, marbleAxisCenterZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[curbWidth, curbHeight, marbleAxisLength]} />
            <meshStandardMaterial {...GROUND_MATERIAL.marbleCoping} />
          </mesh>
        </group>
      ))}

      {/* Warm dressed-stone approach: pool threshold → exact toe of the authored Taj stair. */}
      <mesh position={[0, 0.012, finalApproachCenterZ]} material={paving.approach} receiveShadow>
        <boxGeometry args={[GARDEN.mainPathWidth, 0.018, finalApproachLength]} />
      </mesh>

      {/* Bilateral gazebo spurs: formal destinations, no longer objects in an open apron. */}
      {[-1, 1].map((side) => (
        <group key={`pavilion-court-${side}`}>
          <mesh
            position={[side * pavilionSpurCenterX, 0.013, pavilionZ]}
            material={paving.spur}
            receiveShadow
          >
            <boxGeometry args={[pavilionSpurLength, 0.018, pavilionWalkWidth]} />
          </mesh>
          {[-1, 1].map((edge) => (
            <mesh
              key={`pavilion-spur-edge-${edge}`}
              position={[
                side * pavilionSpurCenterX,
                curbCenterY,
                pavilionZ + edge * (pavilionWalkWidth + curbWidth) / 2,
              ]}
              castShadow={false}
              receiveShadow
            >
              <boxGeometry args={[pavilionSpurLength, curbHeight, curbWidth]} />
              <meshStandardMaterial {...GROUND_MATERIAL.marbleInlay} />
            </mesh>
          ))}
          <mesh
            position={[side * PAVILION.axisOffset, 0.013, pavilionZ]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={paving.court}
            receiveShadow
          >
            <circleGeometry args={[pavilionCourtRadius, 48]} />
          </mesh>
          <mesh
            position={[side * PAVILION.axisOffset, 0.017, pavilionZ]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <ringGeometry args={[pavilionCourtRadius - 0.18, pavilionCourtRadius, 48]} />
            <meshStandardMaterial {...GROUND_MATERIAL.marbleInlay} />
          </mesh>
        </group>
      ))}

      {/* Cross-axis: east-west, centred on the garden's midpoint. */}
      <mesh position={[0, 0.008, gardenCenterZ]} receiveShadow>
        <boxGeometry args={[crossAxisWidth, 0.016, GARDEN.mainPathWidth]} />
        <meshStandardMaterial {...GROUND_MATERIAL.marble} />
      </mesh>

      {/* Side perimeter walkways bounding the four quadrants, stone paving (not marble — a legible hierarchy: marble marks the ceremonial axes, paving marks circulation). */}
      {[-sidePathX, sidePathX].map((x) => (
        <mesh key={`side-path-${x}`} position={[x, 0.006, gardenCenterZ]} receiveShadow>
          <boxGeometry args={[GARDEN.quadrantPathWidth, 0.012, sidePathLength]} />
          <meshStandardMaterial {...GROUND_MATERIAL.stonePaving} />
        </mesh>
      ))}

      {/* A continuous textured stone apron gives the rectangular pool a formal setting. */}
      {[-1, 1].map((side) => (
        <mesh
          key={`pool-side-${side}`}
          position={[(side * (POOL.width + POOL.sidePathWidth)) / 2, 0.012, poolCenterZ]}
          material={paving.spur}
          receiveShadow
        >
          <boxGeometry args={[POOL.sidePathWidth, 0.018, POOL.depth]} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`pool-threshold-${side}`}
          position={[0, 0.013, poolCenterZ + side * (POOL.depth + poolThresholdDepth) / 2]}
          material={paving.court}
          receiveShadow
        >
          <boxGeometry args={[POOL.width + POOL.sidePathWidth * 2, 0.02, poolThresholdDepth]} />
        </mesh>
      ))}
    </>
  );
}
