import { env } from '@config/env';
import { interactionRuntime } from './InteractionRuntime';
import { useInteractionDebugStore } from './useInteractionDebugStore';
import { useInteractionSnapshot } from './useInteractionSnapshot';

export function InteractionDiagnostics3D() {
  if (!env.enableDebugTools) return null;
  return <InteractionDiagnostics3DInner />;
}

function InteractionDiagnostics3DInner() {
  const { active, showBounds, showFocusCones, revision } = useInteractionDebugStore();
  const snapshot = useInteractionSnapshot();
  void revision;
  if (!active || (!showBounds && !showFocusCones)) return null;
  return <group name="interaction-diagnostics">
    {interactionRuntime.registry.list().map((definition) => {
      const selected = snapshot.focusedId === definition.id;
      return <group key={definition.id} position={definition.position}>
        {showBounds && <mesh scale={definition.activationDistance}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshBasicMaterial color={selected ? '#ffe05d' : '#53d7ff'} wireframe transparent opacity={selected ? 0.85 : 0.35} depthWrite={false} />
        </mesh>}
        {showBounds && <mesh>
          <octahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={selected ? '#fff6a8' : '#57deff'} depthTest={false} />
        </mesh>}
        {showFocusCones && definition.focusAngleDegrees !== undefined && <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, definition.activationDistance / 2]}>
          <coneGeometry args={[Math.tan((definition.focusAngleDegrees * Math.PI) / 180) * definition.activationDistance, definition.activationDistance, 16, 1, true]} />
          <meshBasicMaterial color="#ff9b65" wireframe transparent opacity={0.45} depthWrite={false} />
        </mesh>}
      </group>;
    })}
  </group>;
}
