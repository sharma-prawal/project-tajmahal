import { Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { AgXToneMapping } from 'three';
import { CAMERA_DEFAULTS, EXPOSURE } from '@constants/scene';
import { GRAVITY } from '@constants/physics';
import { env } from '@config/env';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { useReviewRenderSettings } from '@core/bakeoff/useReviewRenderSettings';
import { useLightingDebugStore } from '@core/lighting/useLightingDebugStore';
import { DEFAULT_SHADOW_TYPE, SHADOW_TYPE_MAP } from '@core/lighting/shadowTypes';
import { useTraversalDebugStore } from '@core/traversal/useTraversalDebugStore';

interface CanvasRootProps {
  children: ReactNode;
}

/**
 * Owns the renderer/canvas and physics world. Kept dumb on purpose: it knows
 * nothing about the player, camera mode, or environment dressing — those are
 * composed by the caller so this shell is reusable for cutscenes or menus
 * later without dragging gameplay along.
 *
 * Renderer cost (DPR, antialiasing, shadow availability) is driven by
 * `useQualityProfile`, a capability-based tier — not hardcoded to desktop
 * defaults. In bake-off review mode (Phase 3B Part 1), the review store can
 * override this to any of the four reviewed tiers via
 * `useReviewRenderSettings`, so the *actual* renderer/tone-mapping is
 * preserved rather than swapped for a second engine.
 *
 * Tone mapping is a built-in, cheap filmic response (no post-processing pass,
 * no extra dependency) with a base exposure (`Lighting` drives the sunT swing
 * on top each frame). Phase 9C.1 switched ACES Filmic → **AgX**: with the new
 * HDRI image-based lighting, AgX gives a gentler highlight rolloff on the white
 * marble (no clipping to flat white), less hue-shift/oversaturation than ACES,
 * and a calmer, more photographic image — objectively better for this project's
 * "stable whites / warm marble / soft skies" target (exposure re-tuned for it).
 * Shadow map type is PCFSoft when shadows are enabled, matching the
 * `radius`-based softening on the directional light in `Lighting` — omitted
 * entirely on tiers where shadows are off, so it costs nothing there.
 *
 * Phase 4C: the shadow-map *algorithm* (Basic/PCF/PCFSoft/VSM) can be
 * swapped via the dev-only lighting-debug benchmark tool
 * (`shadowTypeOverride`) for the shadow-type comparison in the benchmark
 * matrix — falls back to the Phase 4B default (`DEFAULT_SHADOW_TYPE`,
 * PCFSoft) otherwise, so production behaviour is unchanged.
 */
export function CanvasRoot({ children }: CanvasRootProps) {
  const deviceQuality = useQualityProfile();
  const quality = useReviewRenderSettings(deviceQuality);
  const shadowTypeOverride = useLightingDebugStore((s) => s.shadowTypeOverride);
  const shadowType = SHADOW_TYPE_MAP[shadowTypeOverride ?? DEFAULT_SHADOW_TYPE];
  const collisionDebug = useTraversalDebugStore((state) => state.collisionDebug);

  return (
    <Canvas
      shadows={quality.shadows ? { type: shadowType } : false}
      dpr={quality.dpr}
      gl={{
        antialias: quality.antialias,
        powerPreference: 'high-performance',
        toneMapping: AgXToneMapping,
        toneMappingExposure: EXPOSURE.base,
      }}
      camera={{ fov: CAMERA_DEFAULTS.fov, near: CAMERA_DEFAULTS.near, far: CAMERA_DEFAULTS.far }}
    >
      <Suspense fallback={null}>
        {/* A render-coupled fixed step makes traversal slow down in direct
            proportion to GPU frame rate. Rapier's variable step preserves
            real-time walking speed; the capsule uses CCD and bounded ground
            snapping to keep the simple exploration simulation stable. */}
        <Physics gravity={GRAVITY} timeStep="vary" debug={env.enableDebugTools && collisionDebug}>
          {children}
        </Physics>
      </Suspense>
    </Canvas>
  );
}
