import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute,
  CanvasTexture,
  Color,
  DoubleSide,
  LinearFilter,
  type Mesh,
  type MeshBasicMaterial,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
} from 'three';
import { CLOUDS } from '@constants/atmosphere';
import { useSunsetStore } from '@narrative/useSunsetStore';
import { sunsetColourAt } from '@narrative/sunsetMath';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { useAtmosphereDebugStore } from './useAtmosphereDebugStore';
import { useAtmosphereQuality } from './useAtmosphereQuality';

/**
 * Warm cream rather than pure white. Sunlit morning cloud is warm, and against
 * a cool blue sky a hue difference reads at low luminance contrast where a
 * white-on-pale-blue cloud simply disappears.
 */
const CLOUD_BASE = new Color('#fff3e0');

/** Seamlessly tiling value-noise lattice. */
function lattice(seed: number, size: number): Float32Array {
  const values = new Float32Array(size * size);
  let state = seed >>> 0;
  for (let i = 0; i < values.length; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    values[i] = state / 0x100000000;
  }
  return values;
}

function sampleTiling(values: Float32Array, size: number, u: number, v: number): number {
  const x = u * size;
  const y = v * size;
  const x0 = ((Math.floor(x) % size) + size) % size;
  const y0 = ((Math.floor(y) % size) + size) % size;
  const x1 = (x0 + 1) % size;
  const y1 = (y0 + 1) % size;
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = values[y0 * size + x0] * (1 - sx) + values[y0 * size + x1] * sx;
  const bottom = values[y1 * size + x0] * (1 - sx) + values[y1 * size + x1] * sx;
  return top * (1 - sy) + bottom * sy;
}

/**
 * Soft cumulus alpha, generated at runtime rather than shipped: four octaves of
 * tiling value noise, thresholded so most of the sky stays open. The garden is
 * meant to feel calm, so this deliberately produces scattered fair-weather
 * cloud, never an overcast lid or anything that could read as weather.
 */
function createCloudTexture(): CanvasTexture {
  const size = CLOUDS.textureSize;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(size, size);
  const octaves = [4, 8, 16, 32].map((cells, index) => ({ cells, values: lattice(0x9e3779b9 + index * 7919, cells), amplitude: 0.5 / 2 ** index }));
  const total = octaves.reduce((sum, octave) => sum + octave.amplitude, 0);

  // Summed octaves of value noise cluster tightly around 0.5, so thresholding
  // the raw sum leaves almost nothing above the cut — the first attempt at this
  // produced a technically-present cloud layer that was invisible in every
  // capture. Measure the field first and stretch it to the full range, so the
  // threshold means what it says.
  const density = new Float32Array(size * size);
  let low = Infinity;
  let high = -Infinity;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      for (const { cells, values, amplitude } of octaves) sum += sampleTiling(values, cells, x / size, y / size) * amplitude;
      const value = sum / total;
      density[y * size + x] = value;
      if (value < low) low = value;
      if (value > high) high = value;
    }
  }

  const span = Math.max(1e-6, high - low);
  for (let i = 0; i < density.length; i += 1) {
    // Soft-edged puffs: below the threshold there is simply open sky.
    const normalised = (density[i] - low) / span;
    const t = Math.min(1, Math.max(0, (normalised - CLOUDS.threshold) / CLOUDS.softness));
    const alpha = t * t * (3 - 2 * t);
    // Thin edges sit cooler and darker than dense cores. Flat white cloud on a
    // pale morning sky has no contrast to read against and disappears; this is
    // what gives the puffs any form at all.
    const shade = CLOUDS.edgeShade + (1 - CLOUDS.edgeShade) * alpha;
    image.data[i * 4] = Math.round(255 * shade);
    image.data[i * 4 + 1] = Math.round(255 * shade);
    image.data[i * 4 + 2] = Math.round(255 * Math.min(1, shade + 0.05));
    image.data[i * 4 + 3] = Math.round(alpha * 255);
  }

  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

/**
 * A horizontal disc whose vertex alpha fades to nothing at the rim, so a cloud
 * layer ends in open sky instead of a visible plane edge — cheaper and more
 * controllable than trying to fog geometry that sits above the fog.
 */
function createCloudDisc(radius: number, fadeStart: number) {
  const geometry = new RingGeometry(radius * 0.002, radius, 56, 6);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 4);
  for (let i = 0; i < position.count; i += 1) {
    const distance = Math.hypot(position.getX(i), position.getZ(i)) / radius;
    const t = Math.min(1, Math.max(0, (distance - fadeStart) / (1 - fadeStart)));
    colors.set([1, 1, 1, 1 - t * t * (3 - 2 * t)], i * 4);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 4));
  return geometry;
}

/**
 * Objective 8's living sky. Three near-motionless cloud discs at different
 * altitudes give the sky parallax and depth without touching the renderer, the
 * lighting, the HDRI or the analytic sky the whole narrative `sunT` ramp is
 * built on — the clouds only *read* that ramp, tinting toward the same colour
 * the fog and key light follow so they stay coherent from morning to dusk.
 */
export function CloudLayer() {
  const quality = useAtmosphereQuality();
  const paused = useAtmosphereDebugStore((state) => state.paused);
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const meshes = useRef<(Mesh | null)[]>([]);

  const texture = useMemo(() => createCloudTexture(), []);
  const layers = useMemo(() => CLOUDS.layers.slice(0, quality.cloudLayers).map((layer) => ({
    ...layer,
    geometry: createCloudDisc(layer.radius, layer.fadeStart),
    map: texture.clone(),
  })), [quality.cloudLayers, texture]);

  useEffect(() => {
    layers.forEach(({ geometry, map, repeat }) => {
      geometry.computeBoundingSphere();
      map.repeat.set(repeat, repeat);
      map.needsUpdate = true;
    });
    return () => layers.forEach(({ geometry, map }) => { geometry.dispose(); map.dispose(); });
  }, [layers]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state, delta) => {
    const tint = new Color(sunsetColourAt(useSunsetStore.getState().sunT));
    const drift = paused || reducedMotion ? 0 : delta;
    layers.forEach((layer, index) => {
      layer.map.offset.x += drift * layer.speed;
      layer.map.offset.y += drift * layer.speed * 0.35;
      const mesh = meshes.current[index];
      if (!mesh) return;
      // Follow the camera on the horizontal plane only: a cloud field the player
      // can walk out from under would give the sky a false, near-field scale.
      mesh.position.set(state.camera.position.x, layer.altitude, state.camera.position.z);
      (mesh.material as MeshBasicMaterial).color.copy(CLOUD_BASE).lerp(tint, CLOUDS.sunsetTint);
    });
  });

  return (
    <group name="cloud-layers">
      {layers.map((layer, index) => (
        <mesh
          key={layer.altitude}
          ref={(mesh) => { meshes.current[index] = mesh; }}
          geometry={layer.geometry}
          position={[0, layer.altitude, 0]}
          renderOrder={-10}
          frustumCulled={false}
        >
          <meshBasicMaterial
            map={layer.map}
            vertexColors
            transparent
            opacity={layer.opacity}
            depthWrite={false}
            side={DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}
