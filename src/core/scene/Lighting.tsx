import { useEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraHelper, Color, Vector3, type DirectionalLight, type HemisphereLight } from 'three';
import { EXPOSURE, HEMISPHERE_LIGHT, LIGHTING, SHADOW_TUNING } from '@constants/scene';
import { SUNSET_EXPOSURE_EV_RANGE } from '@constants/narrative';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { useSunsetStore } from '@narrative/useSunsetStore';
import { sunsetColourAt } from '@narrative/sunsetMath';
import { env } from '@config/env';
import { useReviewRenderSettings } from '@core/bakeoff/useReviewRenderSettings';
import { useBakeoffReviewStore } from '@core/bakeoff/useBakeoffReviewStore';
import { useLightingDebugStore } from '@core/lighting/useLightingDebugStore';

const scratchColor = new Color();
const scratchDiagnosticPosition = new Vector3();
const DIAGNOSTIC_LIGHT_OFFSET = new Vector3(0, 12, 6);
const NEUTRAL_SUN_COLOR = '#ffffff';

/**
 * Sun + hemisphere fill. Colour and intensity are driven by `sunT` (Part 5)
 * — a cheap colour-ramp lookup + a restrained ±0.3 EV intensity swing, not a
 * baked/IBL lighting rig. Read directly from the store in `useFrame`
 * (no subscription) since this mutates every frame like camera/player state.
 *
 * In bake-off review mode (Phase 3B Part 4), `lightMode: 'frontalDiagnostic'`
 * parks the key light near the review camera instead of following `sunT` —
 * a bounded, named alternative for isolating shape-reading from the
 * project's sunset direction, not a general lighting rig.
 *
 * Phase 4B additions (all display-only — `sunT` itself is never mutated
 * here): a hemisphere light replaces the old flat ambient for a believable
 * warm-ground/cool-sky indirect fill; the directional light's shadow gets
 * tuned bias/normalBias/radius; renderer exposure (`gl.toneMappingExposure`)
 * gets a restrained sunT-driven swing on top of `EXPOSURE.base`, unless the
 * dev-only lighting debug tool forces a specific exposure or a `neutral`/
 * `finalSunset` display preset (see `useLightingDebugStore`).
 */
export function Lighting() {
  const { gl } = useThree();
  const deviceQuality = useQualityProfile();
  const quality = useReviewRenderSettings(deviceQuality);
  const reviewActive = useBakeoffReviewStore((s) => s.active);
  const lightMode = useBakeoffReviewStore((s) => s.lightMode);
  const lightingDebugActive = useLightingDebugStore((s) => s.active);
  const preset = useLightingDebugStore((s) => s.preset);
  const exposureOverride = useLightingDebugStore((s) => s.exposureOverride);
  const shadowMapSizeOverride = useLightingDebugStore((s) => s.shadowMapSizeOverride);
  const dirLightRef = useRef<DirectionalLight>(null);
  const hemisphereRef = useRef<HemisphereLight>(null);
  const shadowMapSize = shadowMapSizeOverride ?? quality.shadowMapSize;

  // Changing `shadow.mapSize` alone doesn't resize the underlying render target — three only
  // (re)allocates it lazily. Force disposal so the Phase 4C shadow-map-size benchmark sweep
  // actually measures each size, not the first one requested this session.
  useEffect(() => {
    const light = dirLightRef.current;
    if (!light?.shadow.map) return;
    light.shadow.map.dispose();
    light.shadow.map = null;
  }, [shadowMapSize]);

  useFrame((state) => {
    if (reviewActive && lightMode === 'frontalDiagnostic') {
      if (dirLightRef.current) {
        scratchDiagnosticPosition.copy(state.camera.position).add(DIAGNOSTIC_LIGHT_OFFSET);
        dirLightRef.current.position.copy(scratchDiagnosticPosition);
        dirLightRef.current.color.set(NEUTRAL_SUN_COLOR);
        dirLightRef.current.intensity = LIGHTING.sunIntensity;
      }
      if (hemisphereRef.current) {
        hemisphereRef.current.intensity = HEMISPHERE_LIGHT.intensity;
      }
      gl.toneMappingExposure = EXPOSURE.base;
      return;
    }

    const realSunT = useSunsetStore.getState().sunT;
    const neutral = lightingDebugActive && preset === 'neutral';
    const displaySunT = lightingDebugActive && preset === 'finalSunset' ? 1 : realSunT;

    const hex = neutral ? NEUTRAL_SUN_COLOR : sunsetColourAt(displaySunT);
    const evMultiplier = neutral ? 1 : Math.pow(2, (displaySunT - 0.5) * 2 * SUNSET_EXPOSURE_EV_RANGE);

    if (dirLightRef.current) {
      dirLightRef.current.position.set(...LIGHTING.sunPosition);
      dirLightRef.current.color.set(scratchColor.set(hex));
      dirLightRef.current.intensity = LIGHTING.sunIntensity * evMultiplier;
    }
    if (hemisphereRef.current) {
      hemisphereRef.current.intensity = neutral
        ? HEMISPHERE_LIGHT.intensity
        : HEMISPHERE_LIGHT.intensity * (0.85 + 0.3 * (1 - displaySunT));
    }

    const duskExposureMultiplier = neutral ? 1 : 1 + (displaySunT - 0.5) * 2 * EXPOSURE.duskMultiplierRange;
    gl.toneMappingExposure = exposureOverride ?? EXPOSURE.base * duskExposureMultiplier;
  });

  return (
    <>
      <hemisphereLight
        ref={hemisphereRef}
        color={HEMISPHERE_LIGHT.skyColor}
        groundColor={HEMISPHERE_LIGHT.groundColor}
        intensity={HEMISPHERE_LIGHT.intensity}
      />
      <directionalLight
        ref={dirLightRef}
        position={LIGHTING.sunPosition}
        intensity={LIGHTING.sunIntensity}
        castShadow={quality.shadows}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-bias={SHADOW_TUNING.bias}
        shadow-normalBias={SHADOW_TUNING.normalBias}
        shadow-radius={SHADOW_TUNING.radius}
      />
      {env.enableDebugTools && <ShadowCameraDiagnostic dirLightRef={dirLightRef} />}
    </>
  );
}

/** Dev-only shadow-frustum wireframe (Phase 4B "shadow map" debugging) — toggled by the lighting debug tool's `X` key, never mounted outside `env.enableDebugTools`. */
function ShadowCameraDiagnostic({ dirLightRef }: { dirLightRef: RefObject<DirectionalLight> }) {
  const { scene } = useThree();
  const enabled = useLightingDebugStore((s) => s.shadowDiagnostic);
  const helperRef = useRef<CameraHelper | null>(null);

  useEffect(() => {
    if (!enabled || !dirLightRef.current) return;
    const helper = new CameraHelper(dirLightRef.current.shadow.camera);
    helperRef.current = helper;
    scene.add(helper);
    return () => {
      scene.remove(helper);
      helper.dispose();
      helperRef.current = null;
    };
  }, [enabled, dirLightRef, scene]);

  useFrame(() => {
    helperRef.current?.update();
  });

  return null;
}
