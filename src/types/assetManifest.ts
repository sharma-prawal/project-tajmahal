/**
 * Shared schema for the asset pipeline (docs/phase-2/10-asset-pipeline-contract.md).
 * Used by both the Node content-lint script (scripts/content-pipeline/) and,
 * later, the runtime loader. No CMS, no database — these two JSON files
 * (`content/assets.manifest.json`, `content/credits.json`) plus this schema
 * are the whole system.
 */

export type AcquisitionMethod =
  | 'downloaded'
  | 'codex-generated'
  | 'procedural'
  | 'primitive'
  | 'hybrid';

export type AssetCategory =
  | 'architecture'
  | 'environment'
  | 'vegetation'
  | 'props'
  | 'materials'
  | 'sky'
  | 'effects'
  | 'audio'
  | 'ui'
  | 'fixture'; // validation-only dummy assets, never shipped

export type PreloadClassification = 'preload' | 'lazy';
export type EssentialClassification = 'essential' | 'optional';

export interface LodMetadata {
  /** Ordered LOD levels, index 0 = highest detail. Triangle counts must be non-increasing. */
  levels: Array<{ id: string; triangles: number }>;
}

export interface CollisionMetadata {
  /** Primitive collision proxies only — never the render mesh (Part 10). */
  proxyType: 'none' | 'box' | 'capsule' | 'cylinder' | 'ramp' | 'convexHull';
}

export interface AnimationMetadata {
  hasAnimation: boolean;
  clips?: string[];
}

export interface TierVariant {
  tier: 'desktop' | 'mobile';
  path: string;
  compressedBytes: number;
  decodedTextureMemoryBytes?: number;
}

export interface AssetRecord {
  id: string;
  displayName: string;
  category: AssetCategory;
  acquisitionMethod: AcquisitionMethod;
  essential: EssentialClassification;
  /** Runtime path relative to the content root. Content-hashed at build time; this is the pre-hash logical path. */
  runtimePath: string;
  format: string;
  variants: TierVariant[];
  compressedBytes: number;
  decodedTextureMemoryBytes?: number;
  triangles?: number;
  materialCount?: number;
  animation?: AnimationMetadata;
  collision?: CollisionMetadata;
  lod?: LodMetadata;
  preload: PreloadClassification;
  /** SHA-256 of the accepted source file, before any pipeline processing. */
  sourceHash: string;
  /** SHA-256 of the processed runtime file actually shipped. */
  runtimeHash: string;
  /** id referencing a record in credits.json — required for downloaded/hybrid, optional otherwise. */
  creditsId?: string;
  validationStatus: 'pending' | 'passed' | 'failed';
  notes?: string;
}

export interface AssetManifest {
  schemaVersion: 1;
  generatedAt: string;
  assets: AssetRecord[];
}

// --- Licence & provenance (credits.json) ---

export interface DownloadedCredit {
  id: string;
  kind: 'downloaded';
  category: AssetCategory;
  source: string;
  sourceUrl: string;
  author: string;
  license: string;
  attributionRequired: boolean;
  attributionText: string;
  downloadedAt: string;
  originalFormat: string;
  processedFormat: string;
  sourceHash: string;
  notes?: string;
}

export interface GeneratedCredit {
  id: string;
  kind: 'generated';
  category: AssetCategory;
  tool: string;
  model: string;
  modelVersion: string;
  generatedAt: string;
  /** Every prompt/iteration that produced the accepted output. */
  promptLineage: string[];
  outputHash: string;
  intendedUsage: string;
  humanAcceptance: { by: string; at: string } | null;
  compressionQA: 'pending' | 'passed' | 'failed';
  /** MUST be null — generated assets carry provenance, never an invented licence identifier. */
  license: null;
  notes?: string;
}

export type CreditRecord = DownloadedCredit | GeneratedCredit;

export interface CreditsFile {
  schemaVersion: 1;
  credits: CreditRecord[];
}
