import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';
import { env } from '@config/env';
import { MINTS_ANCHOR } from '@core/memoryRuntime/mintsMemoryDefinition';
import { BACK_ANCHOR } from '@core/memoryRuntime/backMemoryDefinition';
import { UMBRELLA_ANCHOR } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { LITTLE_DETAILS_ANCHOR } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { ALL_DAY_CALL_ANCHOR } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { BOARDING_PASSES_ANCHOR } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_ANCHOR } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { MEMORY_DEFINITIONS } from './definitions';
import { parseCandidates, parseSightline } from './bridgeReviewParams';
import { useLandmarkCaptureStore } from './useLandmarkCaptureStore';
import { useBridgeReviewCameraStore } from './useBridgeReviewCameraStore';

type BridgeReviewWindow = typeof window & {
  __tajBridgeCam?: (position: [number, number, number], lookAt: [number, number, number]) => void;
};

/**
 * Parks the camera wherever the capture script last asked, without a reload.
 *
 * Claims the camera the same way `MemoryLandmarkCapture` does — through
 * `useLandmarkCaptureStore`, which `ExplorationCameraRig` has an early-return
 * guard for. Writing a position from a later `useFrame` alone does not win
 * against the rig's per-frame damping.
 */
function BridgeReviewCamera() {
  const { camera } = useThree();
  const target = useBridgeReviewCameraStore((state) => state.camera);

  useEffect(() => {
    if (!env.enableDebugTools) return;
    (window as BridgeReviewWindow).__tajBridgeCam = (position, lookAt) => {
      useBridgeReviewCameraStore.getState().setCamera({ position, lookAt });
      useLandmarkCaptureStore.getState().setActive(true);
    };
    return () => {
      delete (window as BridgeReviewWindow).__tajBridgeCam;
      useLandmarkCaptureStore.getState().setActive(false);
    };
  }, []);

  useFrame(() => {
    if (!target) return;
    camera.position.set(target.position[0], target.position[1], target.position[2]);
    camera.lookAt(new Vector3(target.lookAt[0], target.lookAt[1], target.lookAt[2]));
  });

  return null;
}

/**
 * Phase 10F.2 — dev-only overlay for on-foot bridge-location review.
 *
 * The problem this solves: choosing five bridge positions from a plan view is
 * exactly the "nearest anchor on a spreadsheet" reasoning Phases 10E-10F.1
 * spent their entire length refusing. A position is only defensible once
 * someone has stood at it, at eye height, and looked at what is actually
 * there — planting, path, water, the Taj, the next landmark.
 *
 * So this draws, at world scale and in the real scene:
 *
 * - candidate bridge anchors (`?bridgeCandidates=`), each with its interaction
 *   radius on the ground, so "does this sit in a path" is a *look*, not a sum;
 * - the seven System A trigger volumes (`?showVolumes=1`);
 * - the seven production anchors (`?showAnchors=1`), so a candidate's relation
 *   to the composition it would replace is visible;
 * - a sightline from a candidate to the next journey beat (`?sightline=`).
 *
 * It is **not a level editor**: nothing here writes production data, and no
 * candidate becomes real by being drawn. It renders `null` outside
 * `enableDebugTools`, so it does not exist in a production build.
 *
 *   ?bridgeCandidates=A:-23.5,-59.5|B:-29,-58    draw two labelled candidates
 *   ?showVolumes=1&showAnchors=1                 draw spine volumes / anchors
 *   ?sightline=-23.5,-59.5,-26,-95.2             draw a line between two points
 */

/** Production anchors, for context — read-only, never written. */
const PRODUCTION_ANCHORS: readonly { label: string; position: readonly [number, number, number] }[] = [
  { label: 'mints', position: MINTS_ANCHOR },
  { label: 'boarding-passes', position: BOARDING_PASSES_ANCHOR },
  { label: 'little-details', position: LITTLE_DETAILS_ANCHOR },
  { label: 'back', position: BACK_ANCHOR },
  { label: 'umbrella', position: UMBRELLA_ANCHOR },
  { label: 'friday-night', position: FRIDAY_NIGHT_ANCHOR },
  { label: 'all-day-call', position: ALL_DAY_CALL_ANCHOR },
];

function Ring({ radius, color, y = 0.03 }: { radius: number; color: string; y?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <ringGeometry args={[Math.max(radius - 0.09, 0.01), radius, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.75} depthTest={false} />
    </mesh>
  );
}

/**
 * `distanceFactor` is deliberately small. The first capture run used 22 and
 * every arrival frame came back with a label the width of the screen sitting
 * over the exact ground the frame existed to show — a review tool obscuring
 * the thing under review.
 */
function Label({ text, color, y }: { text: string; color: string; y: number }) {
  return (
    <Html center distanceFactor={90} position={[0, y, 0]} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          background: 'rgba(0,0,0,0.72)',
          color,
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '2px 6px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </Html>
  );
}

export function BridgeReviewOverlay() {
  const params = useMemo(
    () => (env.enableDebugTools && typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null),
    [],
  );
  const candidates = useMemo(() => parseCandidates(params?.get('bridgeCandidates') ?? null), [params]);
  const sightline = useMemo(() => parseSightline(params?.get('sightline') ?? null), [params]);

  if (!env.enableDebugTools || !params) return null;
  const showVolumes = params.has('showVolumes');
  const showAnchors = params.has('showAnchors');
  /** `?reviewLabels=0` for arrival frames, where the ground matters more than the name. */
  const showLabels = params.get('reviewLabels') !== '0';
  // The interaction radius the production memories actually use, so a
  // candidate's ring is the real activation footprint, not a decorative circle.
  const activationRadius = Number(params.get('activationRadius') ?? 6.2);

  return (
    <group name="bridge-review-overlay">
      <BridgeReviewCamera />
      {candidates.map((candidate) => (
        <group key={candidate.label} position={[candidate.x, 0, candidate.z]}>
          {/* A pole at eye height, so the candidate is findable from across the garden. */}
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.7, 8]} />
            <meshBasicMaterial color="#ff7a3d" depthTest={false} />
          </mesh>
          <Ring radius={activationRadius} color="#ff7a3d" />
          {showLabels && <Label text={`${candidate.label} (${candidate.x}, ${candidate.z})`} color="#ff7a3d" y={2.1} />}
        </group>
      ))}

      {showVolumes
        && MEMORY_DEFINITIONS.map((definition) => (
          <group key={definition.id} position={[definition.location.x, 0, definition.location.z]}>
            <Ring radius={definition.discoveryRadius} color="#4da6ff" y={0.02} />
            {showLabels && <Label text={`${definition.id} r${definition.discoveryRadius}`} color="#4da6ff" y={0.9} />}
          </group>
        ))}

      {showAnchors
        && PRODUCTION_ANCHORS.map((anchor) => (
          <group key={anchor.label} position={[anchor.position[0], 0, anchor.position[2]]}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.4, 0.6, 0.4]} />
              <meshBasicMaterial color="#7ddf64" depthTest={false} />
            </mesh>
            {showLabels && <Label text={anchor.label} color="#7ddf64" y={1.1} />}
          </group>
        ))}

      {sightline && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([sightline[0], 1.6, sightline[1], sightline[2], 1.6, sightline[3]]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffd166" depthTest={false} />
        </line>
      )}
    </group>
  );
}
