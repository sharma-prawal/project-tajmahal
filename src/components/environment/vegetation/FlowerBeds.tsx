import { useEffect, useMemo } from 'react';
import { Instance, useGLTF } from '@react-three/drei';
import { Color, DoubleSide, type MeshStandardMaterial } from 'three';
import { useQualityProfile } from '@hooks/useQualityProfile';
import { placeVegetation, type Bounds2D } from '@core/vegetation/placement';
import { CIRCULATION_EXCLUSIONS } from '@core/vegetation/zones';
import { VEGETATION_MATERIAL, VEGETATION_SEED } from '@constants/vegetation';
import {
  PLANT_SPECIES,
  PLANT_SPECIES_PROFILE,
  createPlantBloomGeometry,
  createPlantFoliageGeometry,
  type BedLayer,
} from '@core/vegetation/gardenPlanting';
import { extractInstanceSources } from '@core/vegetation/instancedGltf';
import { prepareFoliageMaterial } from '@core/vegetation/foliageMaterials';
import { CulledInstances } from './CulledInstances';
import { WindMaterial } from '@core/atmosphere/WindMaterial';
import { COMPOSED_FLOWER_BED_BOUNDS, COMPOSED_FLOWER_BED_PALETTE, COMPOSED_FORECOURT_BED_BOUNDS, COMPOSED_FORECOURT_BED_PALETTE, COMPOSED_TAJ_FRONT_BED_BOUNDS, COMPOSED_TAJ_FRONT_BED_PALETTE } from '@core/vegetation/composition';

const PERIWINKLE_URL = '/assets/models/garden-premium/flowering-periwinkle.glb';

/** Three of the pack's six scanned plants — enough variation to break repetition without three more draw calls per bed. */
const PERIWINKLE_VARIANTS = ['periwinkle_plant_01_LOD0', 'periwinkle_plant_02_LOD0', 'periwinkle_plant_03_LOD0'] as const;

/**
 * Marigold, rose and jasmine-cream — the three colours a Mughal pleasure
 * garden was actually planted in, and the harmony the beds are grouped by.
 */
const PALETTE = [VEGETATION_MATERIAL.flowerWarm, VEGETATION_MATERIAL.flowerCool, VEGETATION_MATERIAL.flowerLight];

/**
 * Per-plant colour drift inside a bed's palette. A bed planted in one flat RGB
 * is the other half of the "procedural carpet" tell, so every bloom gets a
 * small deterministic hue/lightness offset — matched, never uniform.
 */
function bloomColor(paletteIndex: number, index: number): Color {
  const wobble = Math.sin(index * 12.9898) * 43758.5453;
  const drift = wobble - Math.floor(wobble);
  return new Color(PALETTE[paletteIndex].color).offsetHSL((drift - 0.5) * 0.05, 0, (drift - 0.5) * 0.14);
}

interface PlantInstance {
  position: [number, number, number];
  rotationY: number;
  scale: number;
  layer: BedLayer;
  /** Which scanned variant a `flowering` plant uses; ignored by generated layers. */
  variant: number;
  color: Color;
}

function formalBedLayer(
  x: number,
  z: number,
  bounds: Bounds2D,
  bedIndex: number,
): BedLayer {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  if (Math.min(width, depth) < 2) {
    const rhythm = Math.floor((x - bounds.minX) / 0.9) + bedIndex;
    if (rhythm % 5 === 0) return 'flowering';
    if (rhythm % 3 === 0) return 'spike';
    return 'rosette';
  }

  const edgeDistance = Math.min(
    x - bounds.minX,
    bounds.maxX - x,
    z - bounds.minZ,
    bounds.maxZ - z,
  );

  // A clipped evergreen edge gives every bed a legible architectural outline.
  // The next band repeats flowering specimens in measured groups; only the
  // centre relaxes into the naturalistic four-layer drifts.
  if (edgeDistance < 0.72) return 'groundcover';
  if (edgeDistance < 1.5) {
    const rhythm = Math.floor((x - bounds.minX) / 1.45)
      + Math.floor((z - bounds.minZ) / 1.45)
      + bedIndex;
    return rhythm % 4 === 0 ? 'flowering' : 'rosette';
  }
  const interiorRhythm = Math.floor((x - bounds.minX) / 1.2)
    + Math.floor((z - bounds.minZ) / 1.2) * 2
    + bedIndex;
  if (interiorRhythm % 4 === 0) return 'spike';
  return 'rosette';
}

export function FlowerBeds() {
  const quality = useQualityProfile();
  const periwinkle = useGLTF(PERIWINKLE_URL);

  // Phase 10B: the beds are no longer one repeated asset. Placement still runs
  // the deterministic jittered grid, but every point then resolves to one of
  // four planting layers in ~3.4 m drifts, so each bed reads as a layered
  // scheme with real height and species variation rather than a carpet of
  // identical flowers (Objectives 3, 6, 7).
  const all = useMemo<PlantInstance[]>(() => {
    const plantBeds = (
      boundsList: readonly Bounds2D[],
      palette: readonly number[],
      seedBase: number,
      exclusions = CIRCULATION_EXCLUSIONS,
    ): PlantInstance[] => boundsList.flatMap((bounds, bedIndex) =>
      placeVegetation({
        bounds,
        // Density and scale are set against how much *soil* a planted bed shows.
        // The first 10B pass kept 10A.1's spacing, and with plants this much
        // smaller than the old flower cluster the beds read as bare earth with
        // seedlings in it — the opposite failure to the carpet, and just as
        // wrong. A real border closes over.
        cellSize: Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) < 2 ? 0.42 : 0.68,
        jitter: Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) < 2 ? 0.28 : 0.55,
        exclusions,
        skipProbability: Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) < 2 ? 0 : 0.03,
        scaleRange: Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) < 2 ? [1.12, 1.34] : [0.94, 1.18],
        seed: seedBase + bedIndex,
      }).map((instance, index) => {
        const layer = formalBedLayer(instance.position[0], instance.position[2], bounds, bedIndex);
        const profile = layer === 'flowering' ? null : PLANT_SPECIES_PROFILE[layer];
        return {
          ...instance,
          layer,
          variant: (bedIndex + index) % PERIWINKLE_VARIANTS.length,
          scale: instance.scale * (profile?.scale ?? 0.86),
          color: bloomColor(palette[bedIndex], bedIndex * 131 + index),
        };
      }),
    );
    return [
      ...plantBeds(COMPOSED_FLOWER_BED_BOUNDS, COMPOSED_FLOWER_BED_PALETTE, VEGETATION_SEED.flowers),
      ...plantBeds(COMPOSED_FORECOURT_BED_BOUNDS, COMPOSED_FORECOURT_BED_PALETTE, VEGETATION_SEED.flowers + 800),
      ...plantBeds(COMPOSED_TAJ_FRONT_BED_BOUNDS, COMPOSED_TAJ_FRONT_BED_PALETTE, VEGETATION_SEED.flowers + 1200, []),
    ];
  }, []);

  const generated = useMemo(() => PLANT_SPECIES.map((species) => ({
    species,
    foliage: createPlantFoliageGeometry(species),
    bloom: createPlantBloomGeometry(species),
  })), []);
  useEffect(() => () => generated.forEach(({ foliage, bloom }) => { foliage.dispose(); bloom?.dispose(); }), [generated]);

  const scanned = useMemo(() => {
    const extracted = extractInstanceSources(periwinkle.scene, PERIWINKLE_VARIANTS);
    // The pack ships its plants as glTF BLEND; the foliage pipeline converts
    // them to alpha-tested cut-outs (see `foliageMaterials`).
    extracted.forEach(({ material }) => prepareFoliageMaterial(material as MeshStandardMaterial));
    return extracted;
  }, [periwinkle.scene]);
  useEffect(() => () => scanned.forEach(({ geometry, material }) => {
    geometry.dispose();
    material.dispose();
  }), [scanned]);

  const visible = quality.name === 'low' ? all.filter((_, index) => index % 2 === 0) : all;

  return (
    <group name="production-flower-beds">
      {generated.map(({ species, foliage, bloom }) => {
        // Groundcover is the continuous living base of every parterre, not a
        // mutually exclusive decorative clump. Upper rosettes, spikes and
        // scanned flowers rise through it; this closes bare soil without
        // increasing draw calls or spilling beyond the authored bed.
        const subset = species === 'groundcover'
          ? visible
          : visible.filter((instance) => instance.layer === species);
        if (subset.length === 0) return null;
        const profile = PLANT_SPECIES_PROFILE[species];
        return (
          <group key={species}>
            <CulledInstances limit={subset.length} range={subset.length} receiveShadow>
              <primitive object={foliage} attach="geometry" />
              <WindMaterial color={profile.foliage} roughness={0.82} side={DoubleSide} familyStrength={profile.windStrength} maxHeight={profile.height} />
              {subset.map((instance, index) => <Instance key={index} position={instance.position} rotation={[0, instance.rotationY, 0]} scale={instance.scale} />)}
            </CulledInstances>
            {bloom && (
              <CulledInstances limit={subset.length} range={subset.length} receiveShadow>
                <primitive object={bloom} attach="geometry" />
                <WindMaterial color="#ffffff" roughness={0.58} side={DoubleSide} vertexColors familyStrength={profile.windStrength} maxHeight={profile.height} />
                {subset.map((instance, index) => <Instance key={index} position={instance.position} rotation={[0, instance.rotationY, 0]} scale={instance.scale} color={instance.color} />)}
              </CulledInstances>
            )}
          </group>
        );
      })}

      {scanned.map((source, variant) => {
        const subset = visible.filter((instance) => instance.layer === 'flowering' && instance.variant === variant);
        if (subset.length === 0) return null;
        return (
          <CulledInstances
            key={`flowering-${variant}`}
            limit={subset.length}
            range={subset.length}
            receiveShadow
          >
            <primitive object={source.geometry} attach="geometry" />
            <primitive object={source.material} attach="material" />
            {subset.map((instance, index) => <Instance key={index} position={instance.position} rotation={[0, instance.rotationY, 0]} scale={instance.scale} />)}
          </CulledInstances>
        );
      })}
    </group>
  );
}

useGLTF.preload(PERIWINKLE_URL);
