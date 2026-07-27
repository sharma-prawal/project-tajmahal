import { copyFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { NodeIO, type Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

/**
 * Phase 10B.1 — decimates the assets whose triangle budget is wildly out of
 * proportion to their on-screen size.
 *
 * A 39 k-triangle flower head occupying a few dozen pixels is not quality, it
 * is waste: the art is fine, the budget is not. These are not replacements —
 * the same asset is re-exported at a density that matches how large it actually
 * appears in the garden. Originals are copied to `content/sources/` first, so
 * the decision is reversible.
 */
const RUNTIME_ROOT = path.resolve('public/assets/models/garden-premium');
const BACKUP_ROOT = path.resolve('content/sources/vegetation-originals');

interface Target {
  file: string;
  /** Triangle budget, chosen against the asset's real on-screen size. */
  triangles: number;
  /** Why this budget — recorded because the number is a judgement, not a formula. */
  reason: string;
}

// `crocus.glb` was tried and dropped: at 20.4 k triangles for a 1 m flower it
// looks like an obvious candidate, but it is built from thousands of tiny
// disconnected petal shells and will not decimate — a 60 % ratio returned
// 20,353 triangles. Nothing to win, so it keeps its original file.
const TARGETS: Target[] = [
  { file: 'pincushion.glb', triangles: 12_000, reason: '0.9 m flower head, 5 placements' },
  { file: 'plants-scene.glb', triangles: 18_000, reason: '5 m planting group, 4 placements' },
];

// These assets already ship meshopt-compressed (drei's `useGLTF` wires the
// decoder), so the encoder has to be registered too or writing them back fails.
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

function countTriangles(document: Document): number {
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

async function optimise({ file, triangles, reason }: Target) {
  const runtimePath = path.join(RUNTIME_ROOT, file);
  const backupPath = path.join(BACKUP_ROOT, file);

  await mkdir(BACKUP_ROOT, { recursive: true });
  // Always decimate from the pristine original, so re-running is idempotent
  // rather than compounding loss on an already-reduced mesh.
  if (!existsSync(backupPath)) await copyFile(runtimePath, backupPath);

  const document = await io.read(backupPath);
  const before = countTriangles(document);
  const beforeBytes = (await stat(backupPath)).size;

  await document.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, triangles / before), error: 0.02 }),
    prune(),
  );

  await io.write(runtimePath, document);
  const afterBytes = (await stat(runtimePath)).size;
  console.log(
    `${file.padEnd(20)} ${before.toLocaleString().padStart(8)}t -> ${countTriangles(document).toLocaleString().padStart(7)}t  `
    + `${(beforeBytes / 1e6).toFixed(2)} -> ${(afterBytes / 1e6).toFixed(2)} MB   (${reason})`,
  );
}

async function run() {
  await MeshoptEncoder.ready;
  for (const target of TARGETS) await optimise(target);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
