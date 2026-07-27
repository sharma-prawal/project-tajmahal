import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { Group, MeshStandardMaterial } from 'three';
import { MathUtils } from 'three';
import {
  TAJ_MAIN_DOOR_Z,
  TAJ_PLATFORM_Y,
  TAJ_PRESENTATION_SCALE,
} from '@constants/tajPlacement';
import { interactionRuntime } from '@core/interaction/InteractionRuntime';
import { useInteractable } from '@core/interaction/useInteractable';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { useMemoryStore } from '@narrative/memory/useMemoryStore';
import { memoryGateProgress } from '@narrative/memory/memoryProgress';
import {
  MAUSOLEUM_GATE_INTERACTION_ID,
  createMausoleumGateInteraction,
  mausoleumGateDoorAngle,
  mausoleumGateState,
  type MausoleumGateState,
} from './gateState';

const DOOR_WIDTH = 2.45 * TAJ_PRESENTATION_SCALE;
const DOOR_HEIGHT = 3.65 * TAJ_PRESENTATION_SCALE;
const DOOR_THICKNESS = 0.18 * TAJ_PRESENTATION_SCALE;
const DOOR_WORLD_Z = TAJ_MAIN_DOOR_Z;
const DOOR_WORLD_Y = TAJ_PLATFORM_Y + DOOR_HEIGHT / 2 + 0.08;

function currentGateState(): MausoleumGateState {
  const progress = memoryGateProgress(
    useMemoryStore.getState().completedIds().length,
    memoryRuntime.getCompletedIds().length,
  );
  return mausoleumGateState(
    progress,
    interactionRuntime.getCompletedIds().includes(MAUSOLEUM_GATE_INTERACTION_ID),
  );
}

/**
 * A local, explicit entrance gate. It deliberately does not alter the save
 * schema: opening is persisted as a normal completed interaction ID.
 */
export function MausoleumGate() {
  const leftDoorRef = useRef<Group>(null);
  const rightDoorRef = useRef<Group>(null);
  const leftMaterialRef = useRef<MeshStandardMaterial>(null);
  const rightMaterialRef = useRef<MeshStandardMaterial>(null);
  const [state, setState] = useState<MausoleumGateState>(() => currentGateState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const interaction = useMemo(() => createMausoleumGateInteraction(state), [state]);
  useInteractable(interaction);

  useFrame((_, delta) => {
    const next = currentGateState();
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
    }
    for (const material of [leftMaterialRef.current, rightMaterialRef.current]) {
      if (!material) continue;
      material.color.set(next === 'not-ready' ? '#2f211b' : '#493225');
      material.emissive.set('#000000');
      material.emissiveIntensity = 0;
    }
    const target = mausoleumGateDoorAngle(next);
    const reducedMotion = useAccessibilityStore.getState().reducedMotion;
    if (leftDoorRef.current) {
      leftDoorRef.current.rotation.y = reducedMotion
        ? target
        : MathUtils.damp(leftDoorRef.current.rotation.y, target, 7, delta);
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.rotation.y = reducedMotion
        ? -target
        : MathUtils.damp(rightDoorRef.current.rotation.y, -target, 7, delta);
    }
  });

  return (
    <>
      <RigidBody type="fixed" colliders={false} name="MausoleumEntranceGateCollider">
        <CuboidCollider
          args={[DOOR_WIDTH / 2, DOOR_HEIGHT / 2, DOOR_THICKNESS / 2]}
          position={[0, DOOR_WORLD_Y, DOOR_WORLD_Z]}
        />
      </RigidBody>
      <group ref={leftDoorRef} position={[-DOOR_WIDTH / 2, DOOR_WORLD_Y, DOOR_WORLD_Z + 0.03]} name="MausoleumOpeningDoorLeft">
        <mesh position={[DOOR_WIDTH / 4, 0, 0]} castShadow>
          <boxGeometry args={[DOOR_WIDTH / 2, DOOR_HEIGHT, 0.12]} />
          <meshStandardMaterial ref={leftMaterialRef} color="#2f211b" roughness={0.72} metalness={0.04} />
        </mesh>
        {[-1.2, 0, 1.2].map((y) => <mesh key={y} position={[DOOR_WIDTH / 4, y, 0.075]} castShadow>
          <boxGeometry args={[DOOR_WIDTH / 2 - 0.18, 0.055, 0.035]} />
          <meshStandardMaterial color="#8d7041" roughness={0.42} metalness={0.45} />
        </mesh>)}
        <mesh position={[DOOR_WIDTH / 2 - 0.2, 0, 0.1]} castShadow>
          <sphereGeometry args={[0.055, 12, 8]} />
          <meshStandardMaterial color="#b79658" roughness={0.3} metalness={0.65} />
        </mesh>
      </group>
      <group ref={rightDoorRef} position={[DOOR_WIDTH / 2, DOOR_WORLD_Y, DOOR_WORLD_Z + 0.03]} name="MausoleumOpeningDoorRight">
        <mesh position={[-DOOR_WIDTH / 4, 0, 0]} castShadow>
          <boxGeometry args={[DOOR_WIDTH / 2, DOOR_HEIGHT, 0.12]} />
          <meshStandardMaterial ref={rightMaterialRef} color="#2f211b" roughness={0.72} metalness={0.04} />
        </mesh>
        {[-1.2, 0, 1.2].map((y) => <mesh key={y} position={[-DOOR_WIDTH / 4, y, 0.075]} castShadow>
          <boxGeometry args={[DOOR_WIDTH / 2 - 0.18, 0.055, 0.035]} />
          <meshStandardMaterial color="#8d7041" roughness={0.42} metalness={0.45} />
        </mesh>)}
        <mesh position={[-DOOR_WIDTH / 2 + 0.2, 0, 0.1]} castShadow>
          <sphereGeometry args={[0.055, 12, 8]} />
          <meshStandardMaterial color="#b79658" roughness={0.3} metalness={0.65} />
        </mesh>
      </group>
    </>
  );
}
