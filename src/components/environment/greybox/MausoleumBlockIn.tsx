import { Suspense } from 'react';
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import { MAUSOLEUM } from '@constants/world';
import {
  TAJ_CENTER_Z,
  TAJ_PLATFORM_Y,
  TAJ_PRESENTATION_SCALE,
} from '@constants/tajPlacement';
import { GREYBOX_COLOR } from '@constants/greyboxMaterials';
import { TajMahal } from '@components/environment/TajMahal';
import {
  TAJ_CENTRAL_STRUCTURE_COLLIDER_SPEC,
  TAJ_COLLISION_HEIGHT,
  TAJ_MINARET_COLLIDER_SPECS,
} from './tajCollision';

const collisionWidth = MAUSOLEUM.width * TAJ_PRESENTATION_SCALE;
const collisionDepth = MAUSOLEUM.depth * TAJ_PRESENTATION_SCALE;

/**
 * The mausoleum exterior. The visible hero mesh is the production Taj model
 * (`TajMahal` — Phase 3C's approved downloaded candidate); this component
 * keeps two things the model itself doesn't provide:
 *
 * - A simple solid collision proxy measured against the downloaded model's
 *   central tomb. The surrounding floor and minarets remain walkable exterior
 *   terrace; the tomb cannot be entered from any facade. The ceremonial door
 *   is sealed separately by `MausoleumGate`.
 *
 * While the model streams in, the box+dome primitive block-in renders as a
 * `Suspense` fallback so the mausoleum silhouette is never simply absent.
 */
export function MausoleumBlockIn() {
  return (
    <group position={[0, TAJ_PLATFORM_Y, TAJ_CENTER_Z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={TAJ_CENTRAL_STRUCTURE_COLLIDER_SPEC.args}
          position={TAJ_CENTRAL_STRUCTURE_COLLIDER_SPEC.position}
        />
        {TAJ_MINARET_COLLIDER_SPECS.map((spec) => (
          <CylinderCollider
            key={`${spec.position[0]}:${spec.position[2]}`}
            args={spec.args}
            position={spec.position}
          />
        ))}
      </RigidBody>
      <Suspense fallback={<BlockInFallback />}>
        <TajMahal />
      </Suspense>
    </group>
  );
}

const domeRadius = collisionWidth / 2;

/** Primitive box+dome silhouette shown only while the production model streams in. */
function BlockInFallback() {
  return (
    <>
      <mesh position={[0, TAJ_COLLISION_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[collisionWidth, TAJ_COLLISION_HEIGHT, collisionDepth]} />
        <meshStandardMaterial color={GREYBOX_COLOR.architecture} roughness={0.85} />
      </mesh>
      <mesh position={[0, TAJ_COLLISION_HEIGHT, 0]} castShadow receiveShadow>
        <sphereGeometry args={[domeRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={GREYBOX_COLOR.architecture} roughness={0.7} />
      </mesh>
    </>
  );
}
