import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { DoubleSide } from 'three';
import { usePlayerTarget } from '@core/camera/PlayerTargetContext';
import { INTERIOR, LETTER_PLINTH, MAUSOLEUM } from '@constants/world';
import { TAJ_CHAMBER_Z, TAJ_LETTER_PLINTH_Z } from '@constants/tajPlacement';
import { GREYBOX_COLOR } from '@constants/greyboxMaterials';

const chamberZ = TAJ_CHAMBER_Z;
const plinthZ = TAJ_LETTER_PLINTH_Z;

const MOUNT_DISTANCE = MAUSOLEUM.depth + 15;
const UNMOUNT_DISTANCE = MAUSOLEUM.depth + 25; // hysteresis band, avoids mount/unmount thrashing at the boundary
const CHECK_INTERVAL_SECONDS = 0.5;

/**
 * The interior chamber as a conditionally-mounted subtree rather than a
 * second `<Canvas>`/scene object — the project is single-canvas by design
 * (ARCHITECTURE.md); this is the practical interpretation of Part 2/6's
 * "interior is a separate optimized scene, not part of the exterior draw"
 * within that constraint: its geometry simply isn't in the render graph
 * (and casts no draw calls) until the player is near the mausoleum, and is
 * unmounted again once they leave.
 */
export function InteriorChamber() {
  const target = usePlayerTarget();
  const [mounted, setMounted] = useState(false);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < CHECK_INTERVAL_SECONDS) return;
    elapsed.current = 0;

    const player = target.current;
    if (!player) return;
    const distance = Math.abs(player.position.z - chamberZ);

    if (!mounted && distance < MOUNT_DISTANCE) setMounted(true);
    else if (mounted && distance > UNMOUNT_DISTANCE) setMounted(false);
  });

  if (!mounted) return null;

  return (
    <group position={[0, 0, 0]}>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, INTERIOR.height / 2, chamberZ]} receiveShadow>
          <boxGeometry args={[INTERIOR.width, INTERIOR.height, INTERIOR.width]} />
          <meshStandardMaterial color={GREYBOX_COLOR.architectureShadow} roughness={0.9} side={DoubleSide} />
        </mesh>
      </RigidBody>
      <mesh position={[0, 1, plinthZ]}>
        <cylinderGeometry args={[LETTER_PLINTH.clearanceRadius * 0.3, LETTER_PLINTH.clearanceRadius * 0.35, 1, 8]} />
        <meshStandardMaterial color={GREYBOX_COLOR.memoryZone} roughness={0.6} />
      </mesh>
    </group>
  );
}
