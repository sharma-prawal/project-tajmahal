import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { Box3, Mesh } from 'three';
import { Box3 as ThreeBox3 } from 'three';
import { env } from '@config/env';

export interface BakeoffMeasurement {
  lodLabel: string;
  triangles: number;
  materials: number;
  moduleCount: number;
  bounds: Box3 | null;
}

const POLL_INTERVAL_MS = 500;

function measure(root: import('three').Object3D | undefined): BakeoffMeasurement {
  if (!root) return { lodLabel: 'not mounted', triangles: 0, materials: 0, moduleCount: 0, bounds: null };

  let triangles = 0;
  const materials = new Set<unknown>();
  let moduleCount = 0;
  const bounds = new ThreeBox3();
  bounds.makeEmpty();

  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    const positionCount = geometry.attributes.position?.count ?? 0;
    triangles += geometry.index ? geometry.index.count / 3 : positionCount / 3;
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => materials.add(m));
    else materials.add(mat);
    bounds.expandByObject(mesh);
  });

  root.traverse((object) => {
    if (object.name.endsWith('-module')) moduleCount += 1;
  });

  return { lodLabel: 'live', triangles: Math.round(triangles), materials: materials.size, moduleCount, bounds };
}

/**
 * Dev-only. Reports triangles / materials / module count / bounds for the
 * bake-off slice (Part 11: "Report: triangles by LOD, materials, draw
 * calls, bounds, module count, estimated mobile cost"). Draw calls and
 * mobile-cost estimate are read from the shared `perfSample` (whole-scene
 * renderer stats) rather than duplicated here — see `PerfHud`.
 */
export function useBakeoffMeasurements(): BakeoffMeasurement {
  const scene = useThree((state) => state.scene);
  const [measurement, setMeasurement] = useState<BakeoffMeasurement>(measure(undefined));

  useEffect(() => {
    if (!env.enableDebugTools) return;
    const interval = setInterval(() => {
      const root = scene.getObjectByName('taj-bakeoff-slice');
      setMeasurement(measure(root));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [scene]);

  return measurement;
}
