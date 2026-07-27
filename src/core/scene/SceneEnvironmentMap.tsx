import { useEffect, useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { EquirectangularReflectionMapping, PMREMGenerator } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { ENVIRONMENT_MAP } from '@constants/scene';
import { useQualityProfile } from '@hooks/useQualityProfile';

const HDRI_URL = '/assets/hdri/morning.hdr';

/**
 * Phase 9C.1 rendering-pipeline upgrade: the image-based lighting environment
 * is now a **calm soft-morning HDRI** (Poly Haven `kloofendal_misty_morning`,
 * CC0), PMREM-prefiltered once and assigned to `scene.environment`.
 *
 * This replaces the previous synthetic `RoomEnvironment` — a neutral grey
 * studio box — which was the renderer bottleneck: every reflective material
 * (marble, sandstone, the bronze fountain, the channel water) was reflecting an
 * indoor room disconnected from the scene. With the morning HDRI, all of them
 * receive physically believable soft-sky IBL and reflections *for free*, and
 * shadow-side surfaces pick up gentle sky colour instead of flat grey.
 *
 * Only `scene.environment` (IBL/reflections) is set — `scene.background` is left
 * to `SkyAndFog`'s analytic sky dome, so the visible sky still follows the
 * `sunT` progression. A soft/misty morning was chosen deliberately: it carries
 * no hard sun disc, so it never introduces a competing bright reflection or a
 * second shadow direction — just calm, even morning light.
 *
 * Cost is a one-time equirect→PMREM prefilter at mount (no per-frame work).
 * Skipped entirely on the `low` tier, which never even loads the HDR.
 */
export function SceneEnvironmentMap() {
  const quality = useQualityProfile();
  if (quality.name === 'low') return null;
  return <SceneEnvironmentMapInner />;
}

function SceneEnvironmentMapInner() {
  const { gl, scene } = useThree();
  const hdr = useLoader(RGBELoader, HDRI_URL);
  const pmremGenerator = useMemo(() => new PMREMGenerator(gl), [gl]);

  useEffect(() => {
    hdr.mapping = EquirectangularReflectionMapping;
    const renderTarget = pmremGenerator.fromEquirectangular(hdr);
    scene.environment = renderTarget.texture;
    scene.environmentIntensity = ENVIRONMENT_MAP.intensity;
    return () => {
      renderTarget.dispose();
      scene.environment = null;
    };
  }, [pmremGenerator, scene, hdr]);

  useEffect(() => () => pmremGenerator.dispose(), [pmremGenerator]);

  return null;
}

useLoader.preload(RGBELoader, HDRI_URL);
