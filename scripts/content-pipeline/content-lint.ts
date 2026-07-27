#!/usr/bin/env tsx
/**
 * TypeScript content-lint: validates content/assets.manifest.json and
 * content/credits.json against the Phase 2 pipeline contract
 * (docs/phase-2/10-asset-pipeline-contract.md), and prints a budget report.
 *
 * Hard failures (exit 1): schema/hygiene violations that would corrupt the
 * pipeline (missing required fields, duplicate ids, missing files, missing
 * licence/provenance, disallowed extensions, unsafe filenames).
 *
 * Warnings (do not fail CI): things a full toolchain would check but this
 * environment's optional tools can't (gltf-validator, toktx, sharp), or
 * documented fallbacks in use (e.g. AAC instead of OGG). Capability
 * detection is graceful — see capabilities.ts.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectCapabilities, printCapabilityReport } from './capabilities.ts';
import type {
  AssetManifest,
  AssetRecord,
  CreditRecord,
  CreditsFile,
} from '../../src/types/assetManifest.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'content');
const MANIFEST_PATH = path.join(CONTENT_DIR, 'assets.manifest.json');
const CREDITS_PATH = path.join(CONTENT_DIR, 'credits.json');

const ALLOWED_EXTENSIONS = new Set(['glb', 'gltf', 'ktx2', 'webp', 'png', 'jpg', 'ogg', 'aac', 'm4a', 'woff2', 'svg']);
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface LintResult {
  errors: string[];
  warnings: string[];
}

function loadManifest(): AssetManifest {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(
      `${MANIFEST_PATH} not found — run "pnpm content:generate-fixtures" first (or acquire real content).`,
    );
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as AssetManifest;
}

function loadCredits(): CreditsFile {
  if (!existsSync(CREDITS_PATH)) {
    throw new Error(`${CREDITS_PATH} not found.`);
  }
  return JSON.parse(readFileSync(CREDITS_PATH, 'utf8')) as CreditsFile;
}

function readPngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  const isPng = buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isPng) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function isValidGlbHeader(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  return buf.readUInt32LE(0) === 0x46546c67 && buf.readUInt32LE(4) === 2;
}

function isValidWoff2Magic(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === 'wOF2';
}

function findCredit(creditsFile: CreditsFile, id: string | undefined): CreditRecord | undefined {
  if (!id) return undefined;
  return creditsFile.credits.find((c) => c.id === id);
}

function validateAsset(
  asset: AssetRecord,
  creditsFile: CreditsFile,
  seenIds: Set<string>,
  toolsAvailable: { gltfValidator: boolean; toktx: boolean },
): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tag = `[${asset.id}]`;

  // Required fields
  for (const field of ['id', 'displayName', 'category', 'acquisitionMethod', 'runtimePath', 'format'] as const) {
    if (!asset[field]) errors.push(`${tag} missing required field "${field}"`);
  }

  // Duplicate IDs
  if (seenIds.has(asset.id)) errors.push(`${tag} duplicate asset id`);
  seenIds.add(asset.id);

  // Filename convention (kebab-case basename, ignoring extension)
  const base = path.basename(asset.runtimePath).replace(/\.[^.]+$/, '');
  if (!KEBAB_CASE.test(base)) {
    errors.push(`${tag} runtimePath basename "${base}" is not kebab-case`);
  }

  // Extension allowlist
  const ext = asset.format.toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    errors.push(`${tag} format "${ext}" is not on the allowed list (${[...ALLOWED_EXTENSIONS].join(', ')})`);
  }

  // Essential/optional classification
  if (asset.essential !== 'essential' && asset.essential !== 'optional') {
    errors.push(`${tag} invalid essential classification "${String(asset.essential)}"`);
  }

  // Missing file check
  const absPath = path.join(CONTENT_DIR, asset.runtimePath);
  if (!existsSync(absPath)) {
    errors.push(`${tag} referenced file does not exist: content/${asset.runtimePath}`);
  } else {
    const bytesOnDisk = statSync(absPath).size;
    if (bytesOnDisk !== asset.compressedBytes) {
      warnings.push(
        `${tag} compressedBytes (${asset.compressedBytes}) does not match on-disk size (${bytesOnDisk}) — manifest may be stale`,
      );
    }
  }

  // Hashes
  if (!asset.sourceHash || !asset.sourceHash.startsWith('sha256-')) {
    errors.push(`${tag} missing or malformed sourceHash`);
  }
  if (!asset.runtimeHash || !asset.runtimeHash.startsWith('sha256-')) {
    errors.push(`${tag} missing or malformed runtimeHash`);
  }

  // Licence / provenance
  if (asset.acquisitionMethod === 'downloaded' || asset.acquisitionMethod === 'hybrid') {
    const credit = findCredit(creditsFile, asset.creditsId);
    if (!credit) {
      errors.push(`${tag} downloaded/hybrid asset has no matching credits.json record (creditsId="${asset.creditsId}")`);
    } else if (credit.kind === 'downloaded') {
      if (!credit.license) errors.push(`${tag} downloaded credit missing license`);
      if (!credit.sourceHash) errors.push(`${tag} downloaded credit missing sourceHash`);
      if (credit.license !== 'CC0' && !credit.attributionText) {
        errors.push(`${tag} non-CC0 downloaded credit ("${credit.license}") missing attributionText`);
      }
    }
  }
  if (asset.acquisitionMethod === 'codex-generated') {
    const credit = findCredit(creditsFile, asset.creditsId);
    if (!credit) {
      errors.push(`${tag} generated asset has no matching credits.json record (creditsId="${asset.creditsId}")`);
    } else if (credit.kind === 'generated') {
      const declaredLicense: unknown = credit.license;
      if (declaredLicense !== null) {
        errors.push(`${tag} generated credit carries an invented licence identifier ("${String(declaredLicense)}") — must be null`);
      }
      for (const field of ['tool', 'model', 'modelVersion', 'generatedAt', 'outputHash', 'intendedUsage'] as const) {
        if (!credit[field]) errors.push(`${tag} generated credit missing provenance field "${field}"`);
      }
      if (!credit.promptLineage || credit.promptLineage.length === 0) {
        errors.push(`${tag} generated credit missing promptLineage`);
      }
      if (!credit.humanAcceptance) {
        warnings.push(`${tag} generated credit has no humanAcceptance recorded yet`);
      }
    } else {
      errors.push(`${tag} generated asset's creditsId points at a "downloaded" credit, not "generated"`);
    }
  }

  // LOD monotonic check
  if (asset.lod && asset.lod.levels.length > 1) {
    for (let i = 1; i < asset.lod.levels.length; i += 1) {
      if (asset.lod.levels[i].triangles > asset.lod.levels[i - 1].triangles) {
        errors.push(`${tag} LOD levels are not monotonically non-increasing in triangle count`);
        break;
      }
    }
  }

  // Variant tier consistency
  const tiersSeen = new Set<string>();
  for (const variant of asset.variants) {
    if (variant.tier !== 'desktop' && variant.tier !== 'mobile') {
      errors.push(`${tag} variant has invalid tier "${String(variant.tier)}"`);
    }
    if (tiersSeen.has(variant.tier)) {
      errors.push(`${tag} duplicate variant tier "${variant.tier}"`);
    }
    tiersSeen.add(variant.tier);
  }

  // Format-specific structural checks (best-effort, pure Node — graceful when deeper tooling is missing)
  if (existsSync(absPath)) {
    const buf = readFileSync(absPath);
    if (ext === 'png') {
      const dims = readPngDimensions(buf);
      if (!dims) {
        errors.push(`${tag} does not have a valid PNG signature`);
      } else {
        const decodedEstimateBytes = dims.width * dims.height * 4;
        if (
          asset.decodedTextureMemoryBytes !== undefined &&
          Math.abs(asset.decodedTextureMemoryBytes - decodedEstimateBytes) > decodedEstimateBytes * 0.5
        ) {
          warnings.push(
            `${tag} declared decodedTextureMemoryBytes (${asset.decodedTextureMemoryBytes}) is far from the naive RGBA8 estimate (${decodedEstimateBytes}) for a ${dims.width}x${dims.height} image`,
          );
        }
      }
      if (!toolsAvailable.toktx) {
        warnings.push(`${tag} KTX2/Basis compression check skipped — toktx not installed.`);
      }
    }
    if (ext === 'glb') {
      if (!isValidGlbHeader(buf)) {
        errors.push(`${tag} does not have a valid GLB header (magic "glTF" + version 2)`);
      }
      if (!toolsAvailable.gltfValidator) {
        warnings.push(`${tag} full glTF conformance check skipped — gltf-validator not installed.`);
      }
    }
    if (ext === 'woff2') {
      if (!isValidWoff2Magic(buf)) {
        errors.push(`${tag} does not have the woff2 magic bytes`);
      }
      warnings.push(`${tag} woff2 structural/glyph validation skipped — no woff2 parser available in this environment.`);
    }
  }

  return { errors, warnings };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function printBudgetReport(manifest: AssetManifest): void {
  let essentialBytes = 0;
  let optionalBytes = 0;
  let preloadBytes = 0;
  let lazyBytes = 0;

  for (const asset of manifest.assets) {
    if (asset.essential === 'essential') essentialBytes += asset.compressedBytes;
    else optionalBytes += asset.compressedBytes;
    if (asset.preload === 'preload') preloadBytes += asset.compressedBytes;
    else lazyBytes += asset.compressedBytes;
  }

  console.log('\n--- Content budget report ---');
  console.log(`  Assets tracked:      ${manifest.assets.length}`);
  console.log(`  Essential (bytes):   ${formatBytes(essentialBytes)}`);
  console.log(`  Optional (bytes):    ${formatBytes(optionalBytes)}`);
  console.log(`  Preload (bytes):     ${formatBytes(preloadBytes)}`);
  console.log(`  Lazy/streamed:       ${formatBytes(lazyBytes)}`);
  console.log('  (Reviewed boot-asset ceilings: desktop <= 10 MB, mobile <= 6 MB — Part 11.)');
  console.log('------------------------------\n');
}

function main() {
  const tools = detectCapabilities();
  printCapabilityReport(tools);
  const toolsAvailable = {
    gltfValidator: tools.find((t) => t.name === 'gltf-validator')?.available ?? false,
    toktx: tools.find((t) => t.name === 'toktx')?.available ?? false,
  };

  const manifest = loadManifest();
  const credits = loadCredits();

  const seenIds = new Set<string>();
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const asset of manifest.assets) {
    const { errors, warnings } = validateAsset(asset, credits, seenIds, toolsAvailable);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
  }

  if (allWarnings.length > 0) {
    console.log(`--- Content-lint warnings (${allWarnings.length}) ---`);
    for (const w of allWarnings) console.log(`  warn: ${w}`);
    console.log('');
  }

  printBudgetReport(manifest);

  if (allErrors.length > 0) {
    console.error(`--- Content-lint FAILED (${allErrors.length} error(s)) ---`);
    for (const e of allErrors) console.error(`  error: ${e}`);
    process.exit(1);
  }

  console.log(`Content-lint passed: ${manifest.assets.length} asset record(s), 0 errors, ${allWarnings.length} warning(s).`);
}

main();
