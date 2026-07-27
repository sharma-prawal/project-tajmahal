import { Stats } from '@react-three/drei';
import { env } from '@config/env';

/** FPS/ms/memory overlay, dev-only. */
export function PerfStats() {
  if (!env.enableDebugTools) return null;
  return <Stats />;
}
