import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  RigidBody,
  CapsuleCollider,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import { Group, Quaternion, Euler } from 'three';
import { useKeyboardMovement } from '@hooks/useKeyboardMovement';
import { useMouseLook } from '@hooks/useMouseLook';
import { useTouchControls } from '@hooks/useTouchControls';
import { usePlayerTarget } from '@core/camera/PlayerTargetContext';
import { useCameraState } from '@core/camera/CameraStateContext';
import { useDeviceStore } from '@state/useDeviceStore';
import { PLAYER_CAPSULE } from '@constants/physics';
import { MOUSE_LOOK, MOVEMENT, TOUCH_LOOK } from '@constants/movement';
import { env } from '@config/env';
import { useTraversalDebugStore } from '@core/traversal/useTraversalDebugStore';
import type { LookDelta } from '@/types/input';
import { parseDevSpawn } from '@core/traversal/devSpawn';
import { OOB_BOUNDS } from '@constants/world';
import { clamp } from '@utils/math';
import { computeMotorTarget } from './motor';
import { evaluateGrounded, groundSnapCorrection, GROUND_CAST_MAX_DISTANCE, selectGroundHit } from './grounded';
import { isInvalidPhysicsState, isOutOfBounds } from './outOfBounds';
import { getLastCheckpoint, setLastCheckpoint } from './lastCheckpoint';
import { ownershipManager } from '@core/memoryRuntime/OwnershipManager';
import { isExplorationModalOpen, useExperienceSettingsStore } from '@state/useExperienceSettingsStore';
import { sampleGamepadAxes } from './gamepad';
import { createExplorationTelemetry, type ExplorationTelemetry } from '@core/traversal/explorationTelemetry';
import { Heroine } from './Heroine';
import type { HeroineMotionSnapshot } from './heroineAnimation';
import { audioManager } from '@core/audio/AudioManager';
import { FOUNTAIN_POSITIONS } from '@components/environment/greybox/Fountains';
import { createLocomotionStartGate } from './locomotionStartGate';

type ExplorationCaptureWindow = typeof window & { __explorationTelemetry?: ExplorationTelemetry };
type ExplorationCaptureCanvas = HTMLCanvasElement & { __explorationTelemetry?: ExplorationTelemetry };

/**
 * Cast origin sits at the capsule's bottom hemisphere center, and the cast
 * ball's radius matches the capsule's own radius — so at rest, the ball's
 * surface exactly touches the ground and `time_of_impact` directly equals
 * the gap between the capsule's real bottom surface and the ground below.
 */
const GROUND_CAST_RADIUS = PLAYER_CAPSULE.radius;
const GROUND_CAST_MAX_TOI = GROUND_CAST_MAX_DISTANCE + 0.2;

/** How often (in fixed steps) to snapshot a "last known good" grounded position for out-of-bounds recovery — avoids a per-step object allocation. */
const CHECKPOINT_UPDATE_INTERVAL_STEPS = 15;

/**
 * Placeholder capsule player, split into three layers that intentionally
 * run at different cadences:
 *
 * 1. Input adapters (useKeyboardMovement/useMouseLook/useTouchControls) —
 *    read every render frame, cheap, just mailbox the latest raw input.
 * 2. Character motor (`computeMotorTarget` + `useBeforePhysicsStep`) — runs
 *    once per fixed physics tick, camera-relative, sets rigid-body velocity.
 *    This is what makes locomotion independent of display refresh rate.
 *    Grounded state comes from a real downward shape-cast (`grounded.ts`),
 *    not a flat-ground rest-height heuristic — this is what makes ramps
 *    (the stairs' hidden ramp collider) and the platform edge report
 *    grounded correctly.
 * 3. Presentation (`useFrame`) — interpolates the physics body's transform
 *    onto a separate visual Group with its own damped facing rotation, and
 *    integrates look deltas into the shared camera orbit state.
 *
 * Also owns out-of-bounds recovery: if the player ends up outside the
 * greybox's collision envelope (or physics produces a non-finite position),
 * they're teleported back to the last known grounded position.
 *
 * No jump, no interactions — Phase 3A scope adds ramp-backed stairs and
 * shape-cast grounding on top of Phase 1's flat-ground locomotion.
 */
export function PlayerController() {
  const initialCheckpoint = getLastCheckpoint();
  const devSpawn = useMemo(() => env.enableDebugTools ? parseDevSpawn(new URLSearchParams(window.location.search).get('spawn')) : null, []);
  const bodyRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<Group>(null);
  const playerTarget = usePlayerTarget();
  const cameraState = useCameraState();
  const { gl, camera } = useThree();
  const { world, rapier } = useRapier();
  const controlScheme = useDeviceStore((state) => state.controlScheme);
  const activeInput = useDeviceStore((state) => state.activeInput);

  const keyboardMovement = useKeyboardMovement();
  const { consumeInto: consumeMouseLookInto } = useMouseLook(gl.domElement);
  const { movement: touchMovement, consumeLookInto: consumeTouchLookInto } = useTouchControls(
    gl.domElement,
  );

  const facing = useRef(0);
  const stepCounter = useRef(0);
  const lookDelta = useRef<LookDelta>({ dx: 0, dy: 0 });
  const targetQuaternion = useRef(new Quaternion());
  const targetEuler = useRef(new Euler());
  const gamepadMovement = useRef({ forward: 0, right: 0, running: false });
  const telemetry = useRef(createExplorationTelemetry());
  const heroineMotion = useRef<HeroineMotionSnapshot>({ speed: 0, running: false, grounded: false, interacting: false });
  const locomotionStartGate = useRef(createLocomotionStartGate());
  const audioMotion = useRef({ x: initialCheckpoint.x, z: initialCheckpoint.z, at: performance.now() / 1000 });

  useEffect(() => {
    if (!env.enableDebugTools) return undefined;
    const value = telemetry.current;
    (window as ExplorationCaptureWindow).__explorationTelemetry = value;
    return () => {
      if ((window as ExplorationCaptureWindow).__explorationTelemetry === value) {
        delete (window as ExplorationCaptureWindow).__explorationTelemetry;
      }
    };
  }, []);

  useEffect(() => {
    if (visualRef.current) {
      playerTarget.current = visualRef.current;
    }
    const restoreHandle = window.setTimeout(() => {
      const body = bodyRef.current;
      if (!body) return;
      const restored = devSpawn ?? getLastCheckpoint();
      body.setTranslation(restored, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      audioMotion.current = { x: restored.x, z: restored.z, at: performance.now() / 1000 };
    }, 0);
    return () => window.clearTimeout(restoreHandle);
  }, [devSpawn, playerTarget]);

  // --- Layer 2: character motor, fixed physics cadence ---
  useBeforePhysicsStep(() => {
    const body = bodyRef.current;
    if (!body) return;

    const translation = body.translation();

    // Out-of-bounds / invalid-state recovery takes priority over motor input.
    if (isInvalidPhysicsState(translation) || isOutOfBounds(translation, OOB_BOUNDS)) {
      body.setTranslation(getLastCheckpoint(), true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Shape-cast grounding: a small ball cast downward from the capsule's
    // bottom, excluding the player's own collider.
    const castOrigin = {
      x: translation.x,
      y: translation.y - PLAYER_CAPSULE.halfHeight,
      z: translation.z,
    };
    const shape = new rapier.Ball(GROUND_CAST_RADIUS);
    const rawHit = world.castShape(
      castOrigin,
      { x: 0, y: 0, z: 0, w: 1 },
      { x: 0, y: -1, z: 0 },
      shape,
      0,
      GROUND_CAST_MAX_TOI,
      true,
      undefined,
      undefined,
      undefined,
      body,
    );
    const primaryHit = rawHit
      ? {
          distance: rawHit.time_of_impact,
          normal: { x: rawHit.normal1.x, y: rawHit.normal1.y, z: rawHit.normal1.z },
        }
      : null;
    const primaryGround = evaluateGrounded(primaryHit);
    let fallbackHit = null;
    if (primaryHit && primaryGround.slope && !primaryGround.slope.walkable) {
      const ray = new rapier.Ray(castOrigin, { x: 0, y: -1, z: 0 });
      const rawRayHit = world.castRayAndGetNormal(
        ray,
        GROUND_CAST_RADIUS + GROUND_CAST_MAX_TOI,
        true,
        undefined,
        undefined,
        undefined,
        body,
      );
      fallbackHit = rawRayHit
        ? {
            distance: Math.max(0, rawRayHit.timeOfImpact - GROUND_CAST_RADIUS),
            normal: { x: rawRayHit.normal.x, y: rawRayHit.normal.y, z: rawRayHit.normal.z },
          }
        : null;
    }
    const hit = selectGroundHit(primaryHit, fallbackHit);
    const groundResult = evaluateGrounded(hit);
    const { grounded } = groundResult;

    if (grounded) {
      stepCounter.current += 1;
      if (stepCounter.current % CHECKPOINT_UPDATE_INTERVAL_STEPS === 0) {
        setLastCheckpoint({ x: translation.x, y: translation.y, z: translation.z });
      }
    }

    const traversalLocked = ownershipManager.isOwned('traversal') || isExplorationModalOpen();
    const input = traversalLocked
      ? { forward: 0, right: 0, running: false }
      :
      activeInput === 'gamepad'
        ? gamepadMovement.current
        : controlScheme === 'desktop'
        ? keyboardMovement.current
        : {
            forward: touchMovement.current.forward,
            right: touchMovement.current.right,
            running: false,
          };

    const currentVelocity = body.linvel();
    if (env.enableDebugTools) {
      const value = telemetry.current; value.x = translation.x; value.y = translation.y; value.z = translation.z; value.velocityX = currentVelocity.x; value.velocityY = currentVelocity.y; value.velocityZ = currentVelocity.z; value.grounded = groundResult.grounded; value.slopeDegrees = groundResult.slope?.angleDeg ?? null; value.activeInput = activeInput; value.moveForward = input.forward; value.moveRight = input.right;
    }

    const settings = useExperienceSettingsStore.getState();
    const target = computeMotorTarget({
      moveRight: input.right,
      moveForward: input.forward,
      cameraYaw: cameraState.current.yaw,
      grounded,
      running: input.running,
    }, env.enableDebugTools ? {
      walkSpeed: useTraversalDebugStore.getState().walkSpeed * settings.movementSpeed,
      acceleration: useTraversalDebugStore.getState().acceleration,
      deceleration: useTraversalDebugStore.getState().deceleration,
      airControl: MOVEMENT.airControl,
    } : { ...MOVEMENT, walkSpeed: MOVEMENT.walkSpeed * settings.movementSpeed });
    const holdForAnimation = locomotionStartGate.current.beforePhysics(target.hasInput);
    if (env.enableDebugTools) telemetry.current.locomotionWarmup = holdForAnimation;

    if (target.facing !== null) {
      facing.current = target.facing;
    }

    // During react-three-rapier's variable-step before-hook the public world
    // timestep can briefly report zero. Never let that freeze the motor;
    // the 60 Hz floor preserves the authored acceleration envelope while the
    // physics integration itself remains render-delta aware.
    const motorStep = Number.isFinite(world.timestep) ? Math.max(world.timestep, 1 / 60) : 1 / 60;
    // Directly author the requested grounded velocity. At long frame deltas,
    // incremental acceleration can be entirely cancelled by the contact
    // friction impulse, making held input appear broken. Air control and the
    // no-input deceleration path remain damped.
    const damp01 = traversalLocked || (target.hasInput && grounded) ? 1 : 1 - Math.exp(-target.rate * motorStep);
    const snap = grounded ? groundSnapCorrection(hit?.distance ?? null, currentVelocity.y) : 0;
    const requestedVelocityX = holdForAnimation ? 0 : target.targetVelocityX;
    const requestedVelocityZ = holdForAnimation ? 0 : target.targetVelocityZ;
    const nextVelocityX = currentVelocity.x + (requestedVelocityX - currentVelocity.x) * damp01;
    const nextVelocityZ = currentVelocity.z + (requestedVelocityZ - currentVelocity.z) * damp01;
    // Follow the ground plane. When grounded on a walkable slope (e.g. the
    // stairs' hidden ramp), give the body the exact vertical velocity that keeps
    // it on the surface for its horizontal velocity. Without this the contact
    // solver cancels the into-slope component of the commanded velocity, so a
    // steep ramp becomes unclimbable and the capsule slides back down; forcing
    // the along-slope velocity makes the ascent smooth and stops slope sliding.
    // On flat ground the normal is (0,1,0) so this is a no-op.
    const groundNormal = grounded ? hit?.normal ?? null : null;
    let nextVelocityY: number;
    if (
      groundNormal &&
      groundNormal.y > 0.2 &&
      (Math.abs(groundNormal.x) > 1e-4 || Math.abs(groundNormal.z) > 1e-4)
    ) {
      nextVelocityY = -(nextVelocityX * groundNormal.x + nextVelocityZ * groundNormal.z) / groundNormal.y;
    } else if (snap !== 0) {
      nextVelocityY = Math.min(0, currentVelocity.y);
    } else {
      nextVelocityY = currentVelocity.y;
    }
    if (snap !== 0) body.setTranslation({ x: translation.x, y: translation.y + snap, z: translation.z }, true);
    body.setLinvel(
      {
        x: nextVelocityX,
        y: nextVelocityY,
        z: nextVelocityZ,
      },
      true,
    );
    // While the start gate holds the body at zero, drive the heroine from her
    // ACTUAL (held) speed, not the requested target. Reporting the full target
    // here made the walk cycle advance at speed while the body stayed put — a
    // moonwalk/skate-in-place that grew with frame hitches on the first step.
    // Idle -> walk is a hard cut, so the walk pose still appears the instant the
    // body is released; nothing is gained by racing the feet ahead during hold.
    heroineMotion.current.speed = holdForAnimation ? 0 : Math.hypot(nextVelocityX, nextVelocityZ);
    heroineMotion.current.running = input.running;
    heroineMotion.current.grounded = grounded;
    heroineMotion.current.interacting = ownershipManager.isOwned('interaction');
    const audioNow = performance.now() / 1000;
    const audioDelta = Math.max(1 / 240, audioNow - audioMotion.current.at);
    const measuredHorizontalSpeed = Math.hypot(translation.x - audioMotion.current.x, translation.z - audioMotion.current.z) / audioDelta;
    audioMotion.current.x = translation.x; audioMotion.current.z = translation.z; audioMotion.current.at = audioNow;
    audioManager.updateLocomotion({ speed: measuredHorizontalSpeed, running: input.running, grounded, enabled: !traversalLocked, nowSeconds: audioNow });
    audioManager.updateSpatialState(translation.x, translation.z, FOUNTAIN_POSITIONS);
  });

  // --- Layer 1 (look) + Layer 3: presentation, render cadence ---
  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body) return;
    if (env.enableDebugTools) {
      (window as ExplorationCaptureWindow).__explorationTelemetry = telemetry.current;
      (gl.domElement as ExplorationCaptureCanvas).__explorationTelemetry = telemetry.current;
      const value = telemetry.current; value.yaw = cameraState.current.yaw; value.pitch = cameraState.current.pitch; value.cameraX = camera.position.x; value.cameraY = camera.position.y; value.cameraZ = camera.position.z;
    }

    const gamepad = typeof navigator.getGamepads === 'function' ? Array.from(navigator.getGamepads()).find((pad) => pad?.connected) : null;
    const gamepadSample = sampleGamepadAxes(gamepad?.axes);
    gamepadMovement.current = gamepadSample.movement;
    if (gamepadSample.active && activeInput !== 'gamepad') useDeviceStore.getState().setActiveInput('gamepad');
    const cameraLocked = ownershipManager.isOwned('camera') || isExplorationModalOpen();
    if (!cameraLocked && activeInput === 'gamepad') {
      const settings = useExperienceSettingsStore.getState(); const invertY = settings.invertCameraY ? -1 : 1;
      cameraState.current.yaw -= gamepadSample.lookX * 1.8 * delta * settings.cameraSensitivity;
      cameraState.current.pitch = clamp(cameraState.current.pitch - gamepadSample.lookY * 1.35 * delta * settings.cameraSensitivity * invertY, MOUSE_LOOK.pitchMin, MOUSE_LOOK.pitchMax);
    } else
    if (!cameraLocked && controlScheme === 'desktop') {
      const { dx, dy } = consumeMouseLookInto(lookDelta.current);
      const tuning = useTraversalDebugStore.getState();
      const settings = useExperienceSettingsStore.getState();
      const sensitivity = (env.enableDebugTools ? tuning.sensitivity : MOUSE_LOOK.sensitivity) * settings.cameraSensitivity;
      const invertY = (settings.invertCameraY || (env.enableDebugTools && tuning.invertY)) ? -1 : 1;
      cameraState.current.yaw -= dx * sensitivity;
      cameraState.current.pitch = clamp(
        cameraState.current.pitch - dy * sensitivity * invertY,
        MOUSE_LOOK.pitchMin,
        MOUSE_LOOK.pitchMax,
      );
    } else if (!cameraLocked) {
      const { dx, dy } = consumeTouchLookInto(lookDelta.current);
      const settings = useExperienceSettingsStore.getState();
      cameraState.current.yaw -= dx * TOUCH_LOOK.sensitivity * settings.cameraSensitivity;
      cameraState.current.pitch = clamp(
        cameraState.current.pitch - dy * TOUCH_LOOK.sensitivity * settings.cameraSensitivity * (settings.invertCameraY ? -1 : 1),
        MOUSE_LOOK.pitchMin,
        MOUSE_LOOK.pitchMax,
      );
    }

    const translation = body.translation();
    if (visualRef.current) {
      visualRef.current.position.set(translation.x, translation.y, translation.z);
      const smoothing = env.enableDebugTools ? useTraversalDebugStore.getState().rotationSmoothing : MOVEMENT.rotationSmoothing;
      targetEuler.current.set(0, facing.current, 0);
      targetQuaternion.current.setFromEuler(targetEuler.current);
      visualRef.current.quaternion.slerp(
        targetQuaternion.current,
        1 - Math.exp(-smoothing * delta),
      );
    }
  });

  return (
    <>
      <RigidBody
        ref={bodyRef}
        colliders={false}
        mass={1}
        lockRotations
        position={devSpawn ? [devSpawn.x, devSpawn.y, devSpawn.z] : [initialCheckpoint.x, initialCheckpoint.y, initialCheckpoint.z]}
        friction={0.12}
        linearDamping={0.5}
        ccd
        canSleep={false}
      >
        <CapsuleCollider args={[PLAYER_CAPSULE.halfHeight, PLAYER_CAPSULE.radius]} friction={0.12} restitution={0} />
      </RigidBody>
      <group ref={visualRef}>
        <Heroine motion={heroineMotion} onAnimationFrame={locomotionStartGate.current.afterRender} />
        {env.enableDebugTools && new URLSearchParams(window.location.search).has('playerCollider') && <mesh castShadow position={[0, 0, 0]}>
          <capsuleGeometry args={[PLAYER_CAPSULE.radius, PLAYER_CAPSULE.halfHeight * 2, 4, 8]} />
          <meshStandardMaterial color="#e8ddc9" roughness={0.6} />
        </mesh>}
      </group>
    </>
  );
}
