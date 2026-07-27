import { useRef } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Vector2, type MeshPhysicalMaterial } from 'three';
import type { MeshReflectorMaterial as MeshReflectorMaterialImpl } from '@react-three/drei/materials/MeshReflectorMaterial';
import { WATER } from '@constants/water';
import { getSharedRippleTexture } from './rippleTexture';
import { useWaterDebugStore } from './useWaterDebugStore';
import { useWaterQuality } from './useWaterQuality';
import { useAccessibilityStore } from '@state/useAccessibilityStore';

interface Props {
  hero?: boolean;
  stable?: boolean;
  calmReflector?: boolean;
  opacity?: number;
  reflectionResolutionCap?: number;
}

export function WaterSurfaceMaterial({ hero = false, stable = false, calmReflector = false, opacity = 0.94, reflectionResolutionCap }: Props) {
  const quality = useWaterQuality();
  const reflectionMode = useWaterDebugStore((state) => state.reflectionMode);
  const amplitude = useWaterDebugStore((state) => state.waveAmplitude);
  const speed = useWaterDebugStore((state) => state.waveSpeed);
  const reflectionIntensity = useWaterDebugStore((state) => state.reflectionIntensity);
  const specularIntensity = useWaterDebugStore((state) => state.specularIntensity);
  const depthColor = useWaterDebugStore((state) => state.depthColor);
  const rippleScale = useWaterDebugStore((state) => state.rippleScale);
  const paused = useWaterDebugStore((state) => state.paused);
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const materialRef = useRef<MeshPhysicalMaterial>(null);
  const reflectorRef = useRef<MeshReflectorMaterialImpl>(null);
  const texture = getSharedRippleTexture();
  const elapsedRef = useRef(0);
  const accumulatorRef = useRef(0);

  texture.repeat.set(rippleScale, rippleScale);
  useFrame((_, delta) => {
    if (stable || paused || reducedMotion) return;
    accumulatorRef.current += delta;
    if (accumulatorRef.current < 1 / quality.updateFps) return;
    elapsedRef.current += accumulatorRef.current;
    accumulatorRef.current = 0;
    texture.offset.set(elapsedRef.current * speed, elapsedRef.current * speed * 0.63);
    materialRef.current?.normalScale.setScalar(amplitude * quality.amplitudeScale);
    reflectorRef.current?.normalScale.setScalar(amplitude * quality.amplitudeScale);
  });

  const requestedPlanar = reflectionMode === 'planar' || (reflectionMode === 'auto' && quality.reflection === 'planar');
  if (stable && calmReflector && requestedPlanar) {
    return <MeshReflectorMaterial
      color={depthColor}
      roughness={0.22}
      metalness={0}
      resolution={reflectionResolutionCap
        ? Math.min(quality.resolution || reflectionResolutionCap, reflectionResolutionCap)
        : quality.resolution || 256}
      mirror={0.4 * reflectionIntensity}
      mixStrength={0.92 * reflectionIntensity}
      mixContrast={1.06}
      blur={[quality.name === 'high' ? 140 : 70, quality.name === 'high' ? 35 : 18]}
      envMapIntensity={specularIntensity}
      reflectorOffset={0.02}
    />;
  }
  if (hero && requestedPlanar) {
    return <MeshReflectorMaterial
      ref={reflectorRef}
      color={depthColor}
      roughness={WATER.roughness}
      metalness={0}
      transparent
      opacity={opacity}
      normalMap={texture}
      distortionMap={texture}
      distortion={amplitude * quality.amplitudeScale * 1.15}
      resolution={reflectionResolutionCap
        ? Math.min(quality.resolution || reflectionResolutionCap, reflectionResolutionCap)
        : quality.resolution || 256}
      mirror={0.52 * reflectionIntensity}
      mixStrength={1.35 * reflectionIntensity}
      mixContrast={1.18}
      blur={[quality.name === 'high' ? 180 : 80, quality.name === 'high' ? 45 : 20]}
      envMapIntensity={specularIntensity}
      reflectorOffset={0.015}
    />;
  }

  if (stable) {
    return <meshPhysicalMaterial
      ref={materialRef}
      color={depthColor}
      roughness={0.26}
      metalness={0}
      clearcoat={quality.name === 'low' ? 0.45 : 0.78}
      clearcoatRoughness={0.16}
      envMapIntensity={reflectionIntensity * specularIntensity}
    />;
  }

  return <meshPhysicalMaterial
    ref={materialRef}
    color={depthColor}
    roughness={WATER.roughness + (quality.name === 'low' ? 0.08 : 0)}
    metalness={0}
    transparent
    opacity={opacity}
    transmission={quality.name === 'low' ? 0.08 : 0.2}
    thickness={0.12}
    ior={1.333}
    clearcoat={quality.name === 'low' ? 0.45 : 0.85}
    clearcoatRoughness={0.1}
    normalMap={texture}
    normalScale={new Vector2(amplitude * quality.amplitudeScale, amplitude * quality.amplitudeScale)}
    envMapIntensity={reflectionIntensity * specularIntensity * 1.35}
  />;
}
