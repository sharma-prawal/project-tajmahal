import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';

/**
 * Phase 10B — fetches the CC0 garden plants adopted for the shrub and bed
 * layers from Poly Haven, packs each to a single `.glb`, and decimates it to a
 * browser-sane triangle budget.
 *
 * Poly Haven ships these as photogrammetry-grade meshes (millions of triangles
 * for one bush), so the simplify pass is not optional — it is the difference
 * between "usable in a browser walk" and "unusable". Source bundles are kept
 * under `content/sources/` so the provenance chain in `content/credits.json`
 * can be re-verified.
 */
const RESOLUTION = '1k';
const API = 'https://api.polyhaven.com';
const SOURCE_ROOT = path.resolve('content/sources/polyhaven-plants');
const RUNTIME_ROOT = path.resolve('public/assets/models/garden-premium');

interface PlantTarget {
  /** Poly Haven asset slug. */
  slug: string;
  /** Runtime filename (without extension). */
  target: string;
  /** Triangle budget after simplification. */
  triangleBudget: number;
}

const TARGETS: PlantTarget[] = [
  { slug: 'shrub_02', target: 'shrub-ornamental', triangleBudget: 9000 },
  { slug: 'periwinkle_plant', target: 'flowering-periwinkle', triangleBudget: 4000 },
];

interface PolyHavenFile {
  url: string;
  size: number;
  md5: string;
  include?: Record<string, { url: string; size: number; md5: string }>;
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

async function download(url: string, destination: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return bytes;
}

function countTriangles(document: Awaited<ReturnType<NodeIO['read']>>): number {
  let triangles = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices()?.getCount();
      const positions = primitive.getAttribute('POSITION')?.getCount() ?? 0;
      triangles += Math.floor((indices ?? positions) / 3);
    }
  }
  return triangles;
}

async function fetchPlant({ slug, target, triangleBudget }: PlantTarget) {
  const files = (await (await fetch(`${API}/files/${slug}`)).json()) as {
    gltf: Record<string, { gltf: PolyHavenFile }>;
  };
  const entry = files.gltf[RESOLUTION].gltf;
  const sourceDir = path.join(SOURCE_ROOT, slug);
  const gltfPath = path.join(sourceDir, `${slug}_${RESOLUTION}.gltf`);

  const hash = createHash('sha256');
  hash.update(await download(entry.url, gltfPath));
  for (const [relative, file] of Object.entries(entry.include ?? {})) {
    hash.update(await download(file.url, path.join(sourceDir, relative)));
  }

  const document = await io.read(gltfPath);
  const before = countTriangles(document);
  await document.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, triangleBudget / before), error: 0.008 }),
    prune(),
  );
  const after = countTriangles(document);

  await mkdir(RUNTIME_ROOT, { recursive: true });
  const runtimePath = path.join(RUNTIME_ROOT, `${target}.glb`);
  await io.write(runtimePath, document);
  const runtimeBytes = await readFile(runtimePath);

  console.log(
    `${slug} -> ${target}.glb  ${before} tris -> ${after} tris  `
    + `${(runtimeBytes.byteLength / 1e6).toFixed(2)} MB  sourceHash=sha256-${hash.digest('hex')}`,
  );
}

async function run() {
  const only = process.argv.slice(2);
  for (const plant of TARGETS) {
    if (only.length && !only.includes(plant.slug)) continue;
    await fetchPlant(plant);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
