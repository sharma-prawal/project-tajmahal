import { useFrame } from '@react-three/fiber';
import { useSunsetStore } from './useSunsetStore';

/**
 * Advances `sunT`'s local easing once per render frame. Freezing (tab
 * hidden/backgrounded, paused) is handled by `useSunsetStore.frozen`, set
 * from `core/recovery` — this component only calls `tick`, it never decides
 * whether time should pass.
 */
export function SunsetTicker() {
  const tick = useSunsetStore((state) => state.tick);
  useFrame((_, delta) => {
    tick(delta);
  });
  return null;
}
