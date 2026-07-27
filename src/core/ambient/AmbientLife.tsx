import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  ShaderMaterial,
  Sphere,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
import { AMBIENT_LIFE } from '@constants/ambientLife';
import { createAmbientLifeData } from './ambientLifeData';
import { useAmbientLifeDebugStore } from './useAmbientLifeDebugStore';
import { useAmbientLifeQuality } from './useAmbientLifeQuality';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { useAtmosphereDebugStore } from '@core/atmosphere/useAtmosphereDebugStore';
import { environmentalMotionScale, environmentalWindTime } from '@core/atmosphere/windModel';
import { AmbientWildlife } from './AmbientWildlife';

const VERTEX_SHADER = /* glsl */`
  uniform float time;
  uniform float density;
  uniform float pixelRatio;
  uniform float diagnostic;
  uniform float birdsEnabled;
  uniform float butterfliesEnabled;
  uniform float petalsEnabled;
  uniform float leavesEnabled;
  uniform float mistEnabled;
  uniform float windTime;
  uniform float windStrength;
  attribute float phase;
  attribute float size;
  attribute float family;
  attribute float rank;
  varying float vFamily;
  varying float vVisible;
  varying float vPhase;
  #include <fog_pars_vertex>

  void main() {
    vec3 p = position;
    float enabled = 0.0;
    float windPrimary = sin(windTime + phase);
    float windSecondary = sin(windTime * 0.47 + phase * 1.83);
    if (family < 0.5) {
      enabled = birdsEnabled;
      p.x = mod(p.x + time * 3.0 + phase * 3.0 + 60.0, 120.0) - 60.0;
      p.z += sin(time * 0.13 + phase) * 4.0;
      p.y += sin(time * 0.7 + phase) * 0.25;
      float flyover = step(0.72, fract(time * 0.018 + phase / 6.28318));
      enabled *= max(flyover, diagnostic);
    } else if (family < 1.5) {
      enabled = butterfliesEnabled;
      // Two incommensurate hover cycles plus a quicker hesitation keep the
      // path from reading as a mechanical ellipse around one fixed point.
      p.x += sin(time * 0.47 + phase) * 0.72 + sin(time * 1.31 + phase * 2.4) * 0.18;
      p.z += cos(time * 0.39 + phase) * 0.64 + sin(time * 1.07 + phase * 1.6) * 0.16;
      p.y += sin(time * 0.83 + phase * 1.7) * 0.19 + abs(sin(time * 1.9 + phase)) * 0.08;
      p.x += windPrimary * windStrength * 4.0;
      p.z += windSecondary * windStrength * 1.8;
    } else if (family < 2.5) {
      enabled = petalsEnabled;
      p.y = 0.45 + mod(p.y - 0.45 - time * 0.22 - phase, 4.8);
      p.x += sin(time * 0.45 + phase) * 0.75;
      p.z += cos(time * 0.31 + phase) * 0.45;
      p.x += windPrimary * windStrength * 7.0;
    } else if (family < 3.5) {
      enabled = leavesEnabled;
      p.y = 0.5 + mod(p.y - 0.5 - time * 0.16 - phase, 5.0);
      p.x += sin(time * 0.32 + phase) * 0.55;
      p.z += cos(time * 0.27 + phase) * 0.35;
      p.x += windPrimary * windStrength * 6.0;
    } else {
      enabled = mistEnabled;
      p.y = 0.28 + mod(p.y - 0.28 + time * 0.055 + phase * 0.08, 0.95);
      p.x += sin(time * 0.18 + phase) * 0.12;
      p.z += cos(time * 0.16 + phase) * 0.12;
      p.x += windPrimary * windStrength * 0.7;
    }

    vVisible = enabled * step(rank, density);
    vFamily = family;
    vPhase = phase;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float familyScale = family < 0.5 ? 130.0 : (family < 1.5 ? 48.0 : (family > 3.5 ? 180.0 : 92.0));
    gl_PointSize = vVisible * clamp(size * pixelRatio * familyScale / max(8.0, -mvPosition.z), diagnostic > 0.5 ? 4.0 : 0.8, diagnostic > 0.5 ? 20.0 : 7.0);
    #include <fog_vertex>
  }
`;

const FRAGMENT_SHADER = /* glsl */`
  uniform float opacity;
  uniform float diagnostic;
  uniform float time;
  varying float vFamily;
  varying float vVisible;
  varying float vPhase;
  #include <fog_pars_fragment>

  float ellipse(vec2 p, vec2 radius) {
    return 1.0 - smoothstep(0.82, 1.0, dot(p / radius, p / radius));
  }

  void main() {
    if (vVisible < 0.5) discard;
    vec2 uv = gl_PointCoord - 0.5;
    float alpha = 0.0;
    vec3 color = vec3(0.16, 0.13, 0.10);
    if (vFamily < 0.5) {
      float flap = 0.08 * sin(time * 5.2 + vPhase);
      alpha = max(ellipse(uv - vec2(-0.22, flap), vec2(0.28, 0.11)), ellipse(uv - vec2(0.22, flap), vec2(0.28, 0.11)));
      color = vec3(0.09, 0.08, 0.07);
    } else if (vFamily < 1.5) {
      float flap = 0.58 + 0.42 * abs(sin(time * 9.3 + vPhase));
      float leftWing = ellipse(uv - vec2(-0.24, 0.03), vec2(0.2 * flap, 0.31));
      float rightWing = ellipse(uv - vec2(0.24, 0.03), vec2(0.2 * flap, 0.31));
      float body = ellipse(uv + vec2(0.0, 0.03), vec2(0.055, 0.34));
      alpha = max(max(leftWing, rightWing) * 0.82, body);
      color = body > 0.5 ? vec3(0.18, 0.13, 0.08) : vec3(0.68, 0.46, 0.19);
    } else if (vFamily < 2.5) {
      float angle = time * 0.7 + vPhase;
      mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      alpha = ellipse(rotation * uv, vec2(0.18, 0.42));
      color = vec3(0.82, 0.45, 0.50);
    } else if (vFamily < 3.5) {
      float angle = time * 0.45 + vPhase;
      mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      vec2 p = rotation * uv;
      alpha = ellipse(p, vec2(0.2, 0.43)) * smoothstep(-0.48, -0.12, p.y);
      color = vec3(0.43, 0.48, 0.20);
    } else {
      float radius = length(uv);
      alpha = (1.0 - smoothstep(0.03, 0.5, radius)) * 0.22;
      color = vec3(0.82, 0.88, 0.86);
    }
    if (diagnostic > 0.5) {
      color = vFamily < 0.5 ? vec3(0.2, 0.8, 1.0) : vFamily < 1.5 ? vec3(1.0, 0.75, 0.05) : vFamily < 2.5 ? vec3(1.0, 0.2, 0.65) : vFamily < 3.5 ? vec3(0.3, 1.0, 0.2) : vec3(0.65, 0.3, 1.0);
      alpha = min(1.0, alpha * 2.8);
    }
    alpha *= opacity;
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function AmbientLife() {
  const quality = useAmbientLifeQuality();
  const debug = useAmbientLifeDebugStore();
  const windAmplitude = useAtmosphereDebugStore((state) => state.windAmplitude);
  const windSpeed = useAtmosphereDebugStore((state) => state.windSpeed);
  const windEnabled = useAtmosphereDebugStore((state) => state.windEnabled);
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const materialRef = useRef<ShaderMaterial>(null);
  const lastUpdate = useRef(0);
  const data = useMemo(() => createAmbientLifeData(), []);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute('position', new BufferAttribute(data.positions, 3));
    result.setAttribute('phase', new BufferAttribute(data.phases, 1));
    result.setAttribute('size', new BufferAttribute(data.sizes, 1));
    result.setAttribute('family', new BufferAttribute(data.families, 1));
    result.setAttribute('rank', new BufferAttribute(data.ranks, 1));
    result.boundingBox = new Box3(new Vector3(-64, 0, -150), new Vector3(64, 32, -18));
    result.boundingSphere = new Sphere(new Vector3(0, 16, -84), 96);
    return result;
  }, [data]);
  const uniforms = useMemo(() => UniformsUtils.merge([UniformsLib.fog, {
    time: { value: 0 }, density: { value: 1 }, pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    opacity: { value: AMBIENT_LIFE.opacity }, diagnostic: { value: 0 }, windTime: { value: 0 }, windStrength: { value: 0 },
    birdsEnabled: { value: 1 }, butterfliesEnabled: { value: 1 }, petalsEnabled: { value: 1 }, leavesEnabled: { value: 1 }, mistEnabled: { value: 1 },
  }]), []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;
    const hz = AMBIENT_LIFE.updateHz[quality.name];
    if (!debug.paused && state.clock.elapsedTime - lastUpdate.current >= 1 / hz) {
      material.uniforms.time.value = state.clock.elapsedTime * debug.speed;
      material.uniforms.windTime.value = environmentalWindTime(state.clock.elapsedTime, windSpeed);
      lastUpdate.current = state.clock.elapsedTime;
    }
    material.uniforms.density.value = Math.min(1, quality.density * debug.density);
    material.uniforms.opacity.value = debug.diagnostic ? Math.min(1, debug.opacity * 1.6) : debug.opacity;
    material.uniforms.diagnostic.value = debug.diagnostic ? 1 : 0;
    // Winged wildlife uses articulated instanced geometry below; the point
    // shader remains only for petals, leaves, and mist.
    material.uniforms.birdsEnabled.value = 0;
    material.uniforms.butterfliesEnabled.value = 0;
    material.uniforms.petalsEnabled.value = debug.petals && quality.petals ? 1 : 0;
    material.uniforms.leavesEnabled.value = debug.leaves && quality.leaves ? 1 : 0;
    material.uniforms.mistEnabled.value = debug.mist && quality.mist ? 1 : 0;
    material.uniforms.windStrength.value = windEnabled ? windAmplitude * environmentalMotionScale(reducedMotion) : 0;
  });

  if (reducedMotion) return null;
  return <>
    <points geometry={geometry} frustumCulled>
      <shaderMaterial ref={materialRef} vertexShader={VERTEX_SHADER} fragmentShader={FRAGMENT_SHADER} uniforms={uniforms} transparent depthWrite={false} blending={debug.diagnostic ? AdditiveBlending : NormalBlending} fog />
    </points>
    <AmbientWildlife
      data={data}
      birdsEnabled={debug.birds && Boolean(quality.birds)}
      butterfliesEnabled={debug.butterflies && Boolean(quality.butterflies)}
      density={Math.min(1, quality.density * debug.density)}
      speed={debug.speed}
      paused={debug.paused}
    />
  </>;
}
