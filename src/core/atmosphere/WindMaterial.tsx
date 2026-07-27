import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ColorRepresentation, IUniform, MeshStandardMaterial } from 'three';
import { useAtmosphereQuality } from './useAtmosphereQuality';
import { useAtmosphereDebugStore } from './useAtmosphereDebugStore';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { environmentalMotionScale, environmentalWindTime } from './windModel';

interface WindMaterialProps {
  color: ColorRepresentation;
  roughness: number;
  metalness?: number;
  familyStrength: number;
  maxHeight: number;
  side?: 0 | 1 | 2;
  /** Required for per-instance `instanceColor` tinting — three only samples `vColor` under `USE_COLOR`. */
  vertexColors?: boolean;
}

interface CompilableShader {
  vertexShader: string;
  uniforms: Record<string, IUniform>;
}

interface WindShader extends CompilableShader {
  uniforms: Record<string, IUniform> & {
    tajWindTime: { value: number };
    tajWindAmplitude: { value: number };
    tajWindSpeed: { value: number };
    tajWindMaxHeight: { value: number };
  };
}

export function WindMaterial({ color, roughness, metalness = 0, familyStrength, maxHeight, side, vertexColors }: WindMaterialProps) {
  const ref = useRef<MeshStandardMaterial>(null);
  const quality = useAtmosphereQuality();
  const windAmplitude = useAtmosphereDebugStore((state) => state.windAmplitude);
  const windSpeed = useAtmosphereDebugStore((state) => state.windSpeed);
  const windEnabled = useAtmosphereDebugStore((state) => state.windEnabled);
  const paused = useAtmosphereDebugStore((state) => state.paused);
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const accumulator = useRef(0);

  const compile = useCallback((shader: CompilableShader) => {
    const windShader = shader as WindShader;
    windShader.uniforms.tajWindTime = { value: 0 };
    windShader.uniforms.tajWindAmplitude = { value: 0 };
    windShader.uniforms.tajWindSpeed = { value: windSpeed };
    windShader.uniforms.tajWindMaxHeight = { value: maxHeight };
    windShader.vertexShader = `
      uniform float tajWindTime;
      uniform float tajWindAmplitude;
      uniform float tajWindSpeed;
      uniform float tajWindMaxHeight;
    ` + windShader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      float tajWindWeight = smoothstep(0.0, tajWindMaxHeight, max(position.y, 0.0));
      float tajWindPhase = position.x * 1.37 + position.z * 0.91;
      #ifdef USE_INSTANCING
        tajWindPhase += instanceMatrix[3].x * 0.17 + instanceMatrix[3].z * 0.11;
      #endif
      float tajWindPrimary = sin(tajWindTime * tajWindSpeed + tajWindPhase);
      float tajWindSecondary = sin(tajWindTime * tajWindSpeed * 0.47 + tajWindPhase * 1.83);
      transformed.x += (tajWindPrimary * 0.72 + tajWindSecondary * 0.28) * tajWindAmplitude * tajWindWeight;
      transformed.z += tajWindSecondary * tajWindAmplitude * 0.32 * tajWindWeight;
    `);
    ref.current!.userData.windShader = windShader;
  }, [maxHeight, windSpeed]);

  useFrame((state, delta) => {
    accumulator.current += delta;
    if (accumulator.current < 1 / quality.updateFps) return;
    accumulator.current = 0;
    const shader = ref.current?.userData.windShader as WindShader | undefined;
    if (!shader) return;
    shader.uniforms.tajWindTime.value = paused ? shader.uniforms.tajWindTime.value : environmentalWindTime(state.clock.elapsedTime, windSpeed);
    shader.uniforms.tajWindSpeed.value = 1;
    shader.uniforms.tajWindAmplitude.value = windEnabled ? windAmplitude * familyStrength * quality.windScale * environmentalMotionScale(reducedMotion) : 0;
  });

  return <meshStandardMaterial
    ref={ref}
    color={color}
    roughness={roughness}
    metalness={metalness}
    side={side}
    vertexColors={vertexColors}
    onBeforeCompile={compile}
    customProgramCacheKey={() => `taj-wind-v1-${maxHeight}`}
  />;
}
