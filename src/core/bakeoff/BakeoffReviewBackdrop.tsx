import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Color } from 'three';
import { env } from '@config/env';
import { useBakeoffReviewStore } from './useBakeoffReviewStore';

const NEUTRAL_BACKGROUND_COLOR = '#808080';

/**
 * Dev-only. Supplies a flat neutral-grey `scene.background` for bake-off
 * review mode's `background: 'neutral'` option (Phase 3B Part 1) — the
 * comparison point against the project's own sunset sky, not a second
 * rendering path. Restores the previous background (letting `SkyAndFog`'s
 * sky mesh show through again) when review mode exits or switches to
 * `'sunset'`.
 */
export function BakeoffReviewBackdrop() {
  if (!env.enableDebugTools) return null;
  return <BakeoffReviewBackdropInner />;
}

function BakeoffReviewBackdropInner() {
  const { scene } = useThree();
  const active = useBakeoffReviewStore((s) => s.active);
  const background = useBakeoffReviewStore((s) => s.background);

  useEffect(() => {
    if (!(active && background === 'neutral')) return;
    const previous = scene.background;
    scene.background = new Color(NEUTRAL_BACKGROUND_COLOR);
    return () => {
      scene.background = previous;
    };
  }, [active, background, scene]);

  return null;
}
