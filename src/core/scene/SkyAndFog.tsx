import { useRef, type ComponentRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky as DreiSky, calcPosFromAngles } from '@react-three/drei';
import type { FogExp2, Vector3 } from 'three';
import { Color } from 'three';
import { FOG, SKY } from '@constants/scene';
import { useSunsetStore } from '@narrative/useSunsetStore';
import { sunsetColourAt } from '@narrative/sunsetMath';
import { useBakeoffReviewStore } from '@core/bakeoff/useBakeoffReviewStore';
import { useLightingDebugStore } from '@core/lighting/useLightingDebugStore';
import { ATMOSPHERE } from '@constants/atmosphere';
import { useAtmosphereDebugStore } from '@core/atmosphere/useAtmosphereDebugStore';
import { skyInclinationFromElevation } from '@core/atmosphere/skyMath';
import { CloudLayer } from '@core/atmosphere/CloudLayer';

/** Sun elevation range (degrees). Phase 9C: a low golden-hour morning sun
 *  (~14°) — warm light raking the marble and long soft shadows, the emotional
 *  core of "peaceful morning". (Morning vs sunset is colour temperature + mood,
 *  not sun height.) The ending stays low; the colour ramp carries it to dusk. */
const ELEVATION_AT_START_DEG = 14;
const ELEVATION_AT_END_DEG = 2;
const NEUTRAL_FOG_COLOR = new Color('#c9c9c9');

/**
 * Physically-based sky dome plus fog to blend the ground into the horizon.
 * Both are driven by `sunT`: the sky's sun elevation descends across the
 * run (a real, cheap colour change from drei's Sky shader, not a swapped
 * environment map — Part 5 forbids continuous env-map replacement), and the
 * fog colour follows the same colour ramp as the directional light so haze
 * and key light stay coherent.
 *
 * Phase 4B: fog switched from linear (`Fog`) to exponential (`FogExp2`) —
 * a softer, more natural falloff for an open garden scene, tuned via
 * `FOG.density` to increase distance perception without ever hiding the
 * Taj at any point along the main axis (verified live — see
 * docs/phase-4/lighting-atmosphere.md).
 *
 * In bake-off review mode (Phase 3B Part 1), `background: 'neutral'` skips
 * the sky (`BakeoffReviewBackdrop` supplies a flat colour instead) and
 * `fog: false` skips fog. The Phase 4B lighting debug tool adds the same
 * kind of independent, named toggle (`fogEnabled`) plus two display presets
 * (`neutral` — flat grey fog/no sunset tint; `finalSunset` — forces the
 * displayed `sunT` to 1) — neither mutates the real `sunT`.
 */
export function SkyAndFog() {
  const fogRef = useRef<FogExp2>(null);
  const skyRef = useRef<ComponentRef<typeof DreiSky>>(null);
  const reviewActive = useBakeoffReviewStore((s) => s.active);
  const reviewBackground = useBakeoffReviewStore((s) => s.background);
  const reviewFog = useBakeoffReviewStore((s) => s.fog);
  const lightingDebugActive = useLightingDebugStore((s) => s.active);
  const lightingPreset = useLightingDebugStore((s) => s.preset);
  const lightingFogEnabled = useLightingDebugStore((s) => s.fogEnabled);
  const hazeScale = useAtmosphereDebugStore((s) => s.hazeScale);

  const showSky = !reviewActive || reviewBackground === 'sunset';
  const showFog = (!reviewActive || reviewFog) && (!lightingDebugActive || lightingFogEnabled);

  useFrame(() => {
    const realSunT = useSunsetStore.getState().sunT;
    const neutral = lightingDebugActive && lightingPreset === 'neutral';
    const displaySunT = lightingDebugActive && lightingPreset === 'finalSunset' ? 1 : realSunT;

    if (fogRef.current) {
      if (neutral) fogRef.current.color.copy(NEUTRAL_FOG_COLOR);
      else fogRef.current.color.set(sunsetColourAt(displaySunT));
      fogRef.current.density = (ATMOSPHERE.fogDensityStart + (ATMOSPHERE.fogDensityEnd - ATMOSPHERE.fogDensityStart) * displaySunT) * hazeScale;
    }
    if (skyRef.current) {
      const elevationDeg = ELEVATION_AT_START_DEG + (ELEVATION_AT_END_DEG - ELEVATION_AT_START_DEG) * displaySunT;
      const inclination = skyInclinationFromElevation(elevationDeg);
      const sunPosition = skyRef.current.material.uniforms.sunPosition.value as Vector3;
      calcPosFromAngles(inclination, SKY.azimuth / 360, sunPosition);
      const uniforms = skyRef.current.material.uniforms;
      if (uniforms.turbidity) uniforms.turbidity.value = ATMOSPHERE.sky.turbidityStart + (ATMOSPHERE.sky.turbidityEnd - ATMOSPHERE.sky.turbidityStart) * displaySunT;
      if (uniforms.rayleigh) uniforms.rayleigh.value = ATMOSPHERE.sky.rayleighStart + (ATMOSPHERE.sky.rayleighEnd - ATMOSPHERE.sky.rayleighStart) * displaySunT;
      if (uniforms.mieCoefficient) uniforms.mieCoefficient.value = ATMOSPHERE.sky.mieCoefficientStart + (ATMOSPHERE.sky.mieCoefficientEnd - ATMOSPHERE.sky.mieCoefficientStart) * displaySunT;
      if (uniforms.mieDirectionalG) uniforms.mieDirectionalG.value = ATMOSPHERE.sky.mieDirectionalGStart + (ATMOSPHERE.sky.mieDirectionalGEnd - ATMOSPHERE.sky.mieDirectionalGStart) * displaySunT;
    }
  });

  return (
    <>
      {showSky && (
        <DreiSky
          ref={skyRef}
          turbidity={SKY.turbidity}
          rayleigh={SKY.rayleigh}
          mieCoefficient={SKY.mieCoefficient}
          mieDirectionalG={SKY.mieDirectionalG}
          inclination={skyInclinationFromElevation(SKY.elevation)}
          azimuth={SKY.azimuth / 360}
        />
      )}
      {/* Phase 10B: clouds belong to the sky, so they follow the same gate —
          bake-off review mode still gets its flat backdrop. */}
      {showSky && <CloudLayer />}
      {showFog && <fogExp2 ref={fogRef} attach="fog" args={[FOG.color, ATMOSPHERE.fogDensityStart]} />}
    </>
  );
}
