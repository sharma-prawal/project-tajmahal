import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { useRapier } from '@react-three/rapier';
import { usePlayerTarget } from './PlayerTargetContext';
import { useCameraState } from './CameraStateContext';
import { computeOrbitOffset } from './orbitMath';
import { EXPLORATION_CAMERA } from '@constants/scene';
import { damp } from '@utils/math';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { useBakeoffReviewStore } from '@core/bakeoff/useBakeoffReviewStore';
import { useLightingDebugStore } from '@core/lighting/useLightingDebugStore';
import { useLandmarkCaptureStore } from '@narrative/memory/useLandmarkCaptureStore';
import { useTraversalDebugStore } from '@core/traversal/useTraversalDebugStore';
import { env } from '@config/env';
import { CAMERA_DEFAULTS } from '@constants/scene';
import { resolveCameraCollisionDistance } from './cameraCollision';
import { ownershipManager } from '@core/memoryRuntime/OwnershipManager';
import { AXIS_LAYOUT } from '@constants/world';
import { useExperienceSettingsStore } from '@state/useExperienceSettingsStore';

/** Camera-comfort baseline (Part 3/9): reduced-motion tracks the player more directly, cutting most of the deliberate cinematic float/lag. */
const REDUCED_MOTION_SMOOTHING_MULTIPLIER = 2.5;
const PANORAMA_GATE_POSITION = new Vector3(0, 24, AXIS_LAYOUT.gateStart + 2);
const PANORAMA_GATE_LOOK_AT = new Vector3(0, 8, AXIS_LAYOUT.mausoleumStart + 24);

const PANORAMA_TAJ_POSITION = new Vector3(0, 24, AXIS_LAYOUT.mausoleumStart + 24);
const PANORAMA_TAJ_LOOK_AT = new Vector3(0, 8, AXIS_LAYOUT.gateStart + 2);

const PANORAMA_FOV = 38;

/**
 * Slow, floaty third-person orbit camera — the "exploration" mode. Position
 * is driven entirely by `CameraStateContext` (yaw/pitch/distance, written by
 * look input adapters), never by the player's own facing — that keeps look
 * input and movement-facing independently controllable, matching the
 * Journey/Pathless reference feel called out in the brief.
 */
export function ExplorationCameraRig() {
  const { camera } = useThree();
  const { world, rapier } = useRapier();
  const target = usePlayerTarget();
  const orbit = useCameraState();
  const currentLookAt = useRef(new Vector3());
  const desiredPosition = useRef(new Vector3());
  const targetLookAt = useRef(new Vector3());
  const rayDirection = useRef(new Vector3());
  const cameraRay = useRef(new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }));
  const collisionDistance = useRef<number>(EXPLORATION_CAMERA.distance);
  const initialized = useRef(false);

  useFrame((_, delta) => {
    const panoramaOpen = useExperienceSettingsStore.getState().panoramaOpen;
    const panoramaView = useExperienceSettingsStore.getState().panoramaView;
    if (panoramaOpen) {
      if (panoramaView === 'taj-to-gate') {
        camera.position.copy(PANORAMA_TAJ_POSITION);
        camera.lookAt(PANORAMA_TAJ_LOOK_AT);
      } else {
        camera.position.copy(PANORAMA_GATE_POSITION);
        camera.lookAt(PANORAMA_GATE_LOOK_AT);
      }
      if (camera instanceof PerspectiveCamera && camera.fov !== PANORAMA_FOV) {
        camera.fov = PANORAMA_FOV;
        camera.updateProjectionMatrix();
      }
      initialized.current = false;
      return;
    }

    if (ownershipManager.isOwned('camera')) return;
    // Dev-only bake-off review mode (Part 11) takes over the camera for its
    // six fixed views (`BakeoffReviewCamera`) — never active in production.
    if (useBakeoffReviewStore.getState().active) return;
    // Dev-only lighting capture mode (Phase 4B) — same pattern, disjoint store.
    if (useLightingDebugStore.getState().active) return;
    // Dev-only memory-landmark capture (Phase 10D.1) — same pattern again.
    if (useLandmarkCaptureStore.getState().active) return;

    const player = target.current;
    if (!player) return;

    const tuning = useTraversalDebugStore.getState();
    const distance = env.enableDebugTools ? tuning.cameraDistance : EXPLORATION_CAMERA.distance;
    const height = env.enableDebugTools ? tuning.cameraHeight : EXPLORATION_CAMERA.height;
    const fov = env.enableDebugTools ? tuning.fov : CAMERA_DEFAULTS.fov;
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    const cameraPerspective = useExperienceSettingsStore.getState().cameraPerspective;

    if (cameraPerspective === 'first-person') {
      const eyeHeight = 1.60;
      const forwardX = Math.sin(orbit.current.yaw) * Math.cos(orbit.current.pitch);
      const forwardY = Math.sin(orbit.current.pitch);
      const forwardZ = Math.cos(orbit.current.yaw) * Math.cos(orbit.current.pitch);

      const eyeX = player.position.x;
      const eyeY = player.position.y + eyeHeight;
      const eyeZ = player.position.z;

      desiredPosition.current.set(eyeX, eyeY, eyeZ);
      targetLookAt.current.set(
        eyeX + forwardX * 10,
        eyeY + forwardY * 10,
        eyeZ + forwardZ * 10,
      );

      camera.position.copy(desiredPosition.current);
      currentLookAt.current.copy(targetLookAt.current);
      camera.lookAt(currentLookAt.current);
      initialized.current = true;
      return;
    } else {
      const offset = computeOrbitOffset(
        orbit.current.yaw,
        orbit.current.pitch,
        distance,
        height,
      );
      desiredPosition.current.set(
        player.position.x + offset.x + Math.cos(orbit.current.yaw) * EXPLORATION_CAMERA.shoulderOffset,
        player.position.y + offset.y,
        player.position.z + offset.z - Math.sin(orbit.current.yaw) * EXPLORATION_CAMERA.shoulderOffset,
      );
      desiredPosition.current.y = Math.max(
        desiredPosition.current.y,
        EXPLORATION_CAMERA.minHeightAboveGround,
      );

      targetLookAt.current.set(
        player.position.x,
        player.position.y + EXPLORATION_CAMERA.lookHeight,
        player.position.z,
      );

      rayDirection.current.subVectors(desiredPosition.current, targetLookAt.current);
      const desiredRayDistance = rayDirection.current.length();
      if (desiredRayDistance > 0.001) {
        rayDirection.current.multiplyScalar(1 / desiredRayDistance);
        cameraRay.current.origin.x = targetLookAt.current.x;
        cameraRay.current.origin.y = targetLookAt.current.y;
        cameraRay.current.origin.z = targetLookAt.current.z;
        cameraRay.current.dir.x = rayDirection.current.x;
        cameraRay.current.dir.y = rayDirection.current.y;
        cameraRay.current.dir.z = rayDirection.current.z;
        const hit = world.castRay(cameraRay.current, desiredRayDistance, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS);
        collisionDistance.current = resolveCameraCollisionDistance({
          desiredDistance: desiredRayDistance,
          currentDistance: collisionDistance.current,
          hitDistance: hit?.timeOfImpact ?? null,
          minimumDistance: EXPLORATION_CAMERA.minimumCollisionDistance,
          margin: EXPLORATION_CAMERA.collisionMargin,
          releaseSmoothing: EXPLORATION_CAMERA.collisionReleaseSmoothing,
          delta,
        });
        desiredPosition.current.copy(targetLookAt.current).addScaledVector(rayDirection.current, collisionDistance.current);
      }
    }

    if (!initialized.current) {
      // Snap on first frame the target becomes available so the camera
      // doesn't fly in from the world origin before the player exists.
      camera.position.copy(desiredPosition.current);
      currentLookAt.current.copy(targetLookAt.current);
      initialized.current = true;
    } else {
      const reducedMotion = useAccessibilityStore.getState().reducedMotion;
      const simulateReduced = env.enableDebugTools && tuning.reducedMotionSimulation;
      const smoothingMultiplier = reducedMotion || simulateReduced ? REDUCED_MOTION_SMOOTHING_MULTIPLIER : 1;
      const baseDamping = env.enableDebugTools ? tuning.cameraDamping : EXPLORATION_CAMERA.positionSmoothing;
      const positionSmoothing = baseDamping * smoothingMultiplier;
      const lookSmoothing = EXPLORATION_CAMERA.lookSmoothing * smoothingMultiplier;

      camera.position.x = damp(camera.position.x, desiredPosition.current.x, positionSmoothing, delta);
      camera.position.y = damp(camera.position.y, desiredPosition.current.y, positionSmoothing, delta);
      camera.position.z = damp(camera.position.z, desiredPosition.current.z, positionSmoothing, delta);
      currentLookAt.current.x = damp(currentLookAt.current.x, targetLookAt.current.x, lookSmoothing, delta);
      currentLookAt.current.y = damp(currentLookAt.current.y, targetLookAt.current.y, lookSmoothing, delta);
      currentLookAt.current.z = damp(currentLookAt.current.z, targetLookAt.current.z, lookSmoothing, delta);
    }

    camera.lookAt(currentLookAt.current);
  });

  return null;
}
