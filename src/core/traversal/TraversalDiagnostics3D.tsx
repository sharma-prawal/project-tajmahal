import { env } from '@config/env';
import { AXIS_LAYOUT, GARDEN } from '@constants/world';
import { useTraversalDebugStore } from './useTraversalDebugStore';

export function TraversalDiagnostics3D() {
  const visible = useTraversalDebugStore((state) => state.pathVisualization);
  if (!env.enableDebugTools || !visible) return null;
  const centerZ = (AXIS_LAYOUT.gardenStart + AXIS_LAYOUT.gardenEnd) / 2;
  const pathX = (GARDEN.channelWidth + GARDEN.mainPathWidth) / 2;
  return <group position={[0, 0.035, centerZ]}>
    {[-pathX, pathX].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[GARDEN.mainPathWidth * 0.75, GARDEN.axisLength]} />
      <meshBasicMaterial color="#36e0ff" transparent opacity={0.28} depthWrite={false} />
    </mesh>)}
  </group>;
}
