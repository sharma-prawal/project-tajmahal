import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';
import { ATMOSPHERE } from '@constants/atmosphere';
import { useAtmosphereQuality } from './useAtmosphereQuality';
import { useAtmosphereDebugStore } from './useAtmosphereDebugStore';
import { createAtmosphereParticleData } from './particleData';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { environmentalMotionScale, environmentalWindTime } from './windModel';

const VERTEX_SHADER = /* glsl */`
  uniform float time;
  uniform float drift;
  uniform float pixelRatio;
  attribute float phase;
  attribute float size;
  #include <fog_pars_vertex>
  void main() {
    vec3 p = position;
    p.x += sin(time * 0.16 + phase) * drift;
    p.y += sin(time * 0.11 + phase * 1.7) * drift * 0.35;
    p.z += cos(time * 0.13 + phase * 0.7) * drift * 0.55;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp(size * pixelRatio * 16.0 / max(1.0, -mvPosition.z), 0.6, 3.2);
    #include <fog_vertex>
  }
`;

const FRAGMENT_SHADER = /* glsl */`
  uniform vec3 moteColor;
  uniform float opacity;
  #include <fog_pars_fragment>
  void main() {
    vec2 point = gl_PointCoord - vec2(0.5);
    float alpha = smoothstep(0.25, 0.02, dot(point, point)) * opacity;
    if (alpha < 0.006) discard;
    gl_FragColor = vec4(moteColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function AtmosphericParticles() {
  const quality = useAtmosphereQuality();
  const enabled = useAtmosphereDebugStore((state) => state.particlesEnabled);
  const opacity = useAtmosphereDebugStore((state) => state.particleOpacity);
  const paused = useAtmosphereDebugStore((state) => state.paused);
  const diagnostic = useAtmosphereDebugStore((state) => state.diagnostic);
  const windAmplitude = useAtmosphereDebugStore((state) => state.windAmplitude);
  const windSpeed = useAtmosphereDebugStore((state) => state.windSpeed);
  const windEnabled = useAtmosphereDebugStore((state) => state.windEnabled);
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const materialRef = useRef<ShaderMaterial>(null);
  const data = useMemo(() => createAtmosphereParticleData(ATMOSPHERE.particles.highCount), []);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute('position', new BufferAttribute(data.positions, 3));
    result.setAttribute('phase', new BufferAttribute(data.phases, 1));
    result.setAttribute('size', new BufferAttribute(data.sizes, 1));
    result.computeBoundingSphere();
    return result;
  }, [data]);
  const uniforms = useMemo(() => UniformsUtils.merge([
    UniformsLib.fog,
    {
      time: { value: 0 },
      drift: { value: 0.32 },
      pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      opacity: { value: opacity },
      moteColor: { value: new Color(ATMOSPHERE.particles.color) },
    },
  ]), [opacity]);

  useEffect(() => {
    geometry.setDrawRange(0, quality.particleCount);
  }, [geometry, quality.particleCount]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    if (!materialRef.current) return;
    const uniforms = materialRef.current.uniforms;
    if (!paused && uniforms.time) uniforms.time.value = environmentalWindTime(state.clock.elapsedTime, windSpeed);
    if (uniforms.drift) uniforms.drift.value = windEnabled ? windAmplitude * 7.1 * environmentalMotionScale(reducedMotion) : 0;
    if (uniforms.opacity) uniforms.opacity.value = diagnostic ? Math.min(0.8, opacity * 3) : opacity;
    if (uniforms.moteColor) uniforms.moteColor.value.set(diagnostic ? '#ff4fd8' : ATMOSPHERE.particles.color);
  });

  if (!enabled || reducedMotion || quality.particleCount === 0) return null;
  return <points geometry={geometry} frustumCulled>
    <shaderMaterial
      ref={materialRef}
      vertexShader={VERTEX_SHADER}
      fragmentShader={FRAGMENT_SHADER}
      uniforms={uniforms}
      transparent
      depthWrite={false}
      blending={diagnostic ? AdditiveBlending : NormalBlending}
      fog
    />
  </points>;
}
