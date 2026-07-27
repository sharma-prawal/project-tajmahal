import type { RuntimeMemoryDefinition } from '@core/memoryRuntime/types';
import type { SourceMemoryRecord } from './types';

const SUPPORTED_ASSETS = new Set(['procedural:mints-dish-v1', 'procedural:back-pavilion-accent-v1', 'procedural:umbrella-path-accent-v1', 'procedural:little-details-inlay-v1', 'procedural:all-day-call-path-cadence-v1', 'procedural:boarding-passes-collaboration-grid-v1', 'procedural:friday-night-open-enclosure-v1']);
export function validateSourceMemories(records: readonly SourceMemoryRecord[], runtimeDefinitions: readonly RuntimeMemoryDefinition[]): void {
  const ids = new Set<string>(); const runtimeIds = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`Duplicate source memory id: ${record.id}`); ids.add(record.id);
    if (!record.originalText.trim() || !record.approvedText.trim()) throw new Error(`Memory ${record.id} is missing approved or original text`);
    if (record.approvalStatus !== 'approved' || !['source-only', 'implemented'].includes(record.productionStatus)) throw new Error(`Invalid source status: ${record.id}`);
    if (record.contentVersion !== 1 && record.contentVersion !== 2) throw new Error(`Unsupported source content version: ${record.id}`);
    for (const asset of record.assetReferences) if (!SUPPORTED_ASSETS.has(asset)) throw new Error(`Unsupported asset reference ${asset}`);
    if (record.productionStatus === 'source-only' && (record.runtimeMemoryId || record.interactionId)) throw new Error(`Source-only memory ${record.id} is accidentally playable`);
    if (record.runtimeMemoryId) { if (runtimeIds.has(record.runtimeMemoryId)) throw new Error(`Duplicate runtime memory id: ${record.runtimeMemoryId}`); runtimeIds.add(record.runtimeMemoryId); }
  }
  for (const record of records) {
    const linked = runtimeDefinitions.filter((definition) => definition.sourceMemoryId === record.id);
    if (record.productionStatus === 'implemented' && (linked.length !== 1 || linked[0].id !== record.runtimeMemoryId || linked[0].triggerInteractionId !== record.interactionId)) throw new Error(`Implemented memory ${record.id} has an invalid runtime link`);
    if (record.productionStatus === 'source-only' && linked.length) throw new Error(`Source-only memory ${record.id} was registered as playable`);
  }
}
