export type SourceMemoryId =
  | 'memory.all-day-call' | 'memory.back' | 'memory.boarding-passes' | 'memory.mints'
  | 'memory.umbrella' | 'memory.little-details' | 'memory.friday-night';
export type SourceMemoryProductionStatus = 'source-only' | 'implemented';
export interface SourceMemoryRecord {
  id: SourceMemoryId;
  workingTitle: string;
  originalText: string;
  approvedText: string;
  approvalStatus: 'approved';
  productionStatus: SourceMemoryProductionStatus;
  contentVersion: 1 | 2;
  authenticityNotes: string[];
  boundaryNotes: string[];
  assetReferences: string[];
  interactionId: string | null;
  implementationPhase: string | null;
  runtimeMemoryId: string | null;
  futureAuthoringNotes: string[];
}
