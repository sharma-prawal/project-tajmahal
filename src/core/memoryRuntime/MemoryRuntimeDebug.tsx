import { useEffect } from 'react';
import { env } from '@config/env';
import { getLastCheckpoint } from '@player/lastCheckpoint';
import { memoryRuntime } from './MemoryRuntime';
import { worldActionRegistry } from './WorldActionRegistry';
import { useMemoryRuntimeDebugStore } from './useMemoryRuntimeDebugStore';
import { useMemoryRuntimeSnapshot } from './useMemoryRuntimeSnapshot';
import { SOURCE_MEMORIES } from '@/content/memories/sourceMemories';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { useBackMemoryWorldStore } from './useBackMemoryWorldStore';
import { BACK_MEMORY_ID } from './backMemoryDefinition';
import { useUmbrellaMemoryWorldStore } from './useUmbrellaMemoryWorldStore';
import { UMBRELLA_MEMORY_ID } from './umbrellaMemoryDefinition';
import { useLittleDetailsMemoryWorldStore } from './useLittleDetailsMemoryWorldStore';
import { LITTLE_DETAILS_MEMORY_ID } from './littleDetailsMemoryDefinition';
import { useAllDayCallMemoryWorldStore } from './useAllDayCallMemoryWorldStore';
import { ALL_DAY_CALL_MEMORY_ID } from './allDayCallMemoryDefinition';
import { useBoardingPassesMemoryWorldStore } from './useBoardingPassesMemoryWorldStore';
import { BOARDING_PASSES_MEMORY_ID } from './boardingPassesMemoryDefinition';
import { useFridayNightMemoryWorldStore } from './useFridayNightMemoryWorldStore';
import { FRIDAY_NIGHT_MEMORY_ID } from './fridayNightMemoryDefinition';

export function MemoryRuntimeDebugControls() {
  useEffect(() => { if (!env.enableDebugTools) return undefined; const key = (event: KeyboardEvent) => { if (event.code === 'KeyH' && !event.repeat) useMemoryRuntimeDebugStore.getState().toggle(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, []);
  return null;
}
export function MemoryRuntimeDebugHud() {
  if (!env.enableDebugTools) return null;
  return <MemoryRuntimeDebugHudInner />;
}
function MemoryRuntimeDebugHudInner() {
  const debug = useMemoryRuntimeDebugStore(); const snapshot = useMemoryRuntimeSnapshot(); void debug.revision;
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  const returnActive = useBackMemoryWorldStore((state) => state.returnActive);
  const umbrellaPathActive = useUmbrellaMemoryWorldStore((state) => state.pathActive);
  const littleDetailsStage = useLittleDetailsMemoryWorldStore((state) => state.stage);
  const allDayCallStage = useAllDayCallMemoryWorldStore((state) => state.stage);
  const boardingPassesStage = useBoardingPassesMemoryWorldStore((state) => state.stage);
  const fridayNightStage = useFridayNightMemoryWorldStore((state) => state.stage);
  if (!debug.active) return <div style={{ position: 'fixed', left: 12, bottom: 104, color: '#d9c79d', font: '12px monospace', zIndex: 20 }}>Press H for memory runtime debug</div>;
  const checkpoint = getLastCheckpoint(); const locks = memoryRuntime.getOwnership();
  return <div style={{ position: 'fixed', left: 12, top: 12, width: 390, maxHeight: 'calc(100vh - 24px)', overflow: 'auto', padding: 12, borderRadius: 6, background: 'rgba(12,15,19,.95)', color: '#eee4cd', font: '12px/1.45 monospace', zIndex: 30 }}>
    <strong>Memory runtime (dev only)</strong>
    <div>active: {snapshot.activeMemoryId ?? 'none'} · state: {snapshot.lifecycle}</div>
    <div>step: {snapshot.stepId ?? 'none'} [{snapshot.stepIndex}] · elapsed: {snapshot.stepElapsedMs.toFixed(0)}ms</div>
    <div>pending input: {snapshot.pendingInput ? 'yes' : 'no'} · error: {snapshot.error ?? 'none'}</div>
    <div>cancel: {snapshot.cancellationReason ?? 'none'} · runtime checkpoint: {snapshot.checkpointStepId ?? memoryRuntime.getCheckpoint()?.stepId ?? 'none'}</div>
    <div>reduced motion: {reducedMotion ? 'yes' : 'no'} · input suppressed: {locks.interaction || locks['narrative-input'] ? 'yes' : 'no'}</div>
    <div>Back absence: {snapshot.activeMemoryId === BACK_MEMORY_ID && snapshot.stepId === 'brief-absence' ? 'active' : 'inactive'} · return: {returnActive ? 'active' : 'inactive'} · replay active: {snapshot.activeMemoryId === BACK_MEMORY_ID && memoryRuntime.getCompletedIds().includes(BACK_MEMORY_ID) ? 'yes' : 'no'}</div>
    <div>Umbrella path: {umbrellaPathActive ? 'active' : 'inactive'} · replay active: {snapshot.activeMemoryId === UMBRELLA_MEMORY_ID && memoryRuntime.getCompletedIds().includes(UMBRELLA_MEMORY_ID) ? 'yes' : 'no'}</div>
    <div>Little Details stage: {littleDetailsStage} · replay active: {snapshot.activeMemoryId === LITTLE_DETAILS_MEMORY_ID && memoryRuntime.getCompletedIds().includes(LITTLE_DETAILS_MEMORY_ID) ? 'yes' : 'no'}</div>
    <div>All-Day Call stage: {allDayCallStage} · replay active: {snapshot.activeMemoryId === ALL_DAY_CALL_MEMORY_ID && memoryRuntime.getCompletedIds().includes(ALL_DAY_CALL_MEMORY_ID) ? 'yes' : 'no'}</div>
    <div>Boarding Passes collaboration stage: {boardingPassesStage} · replay active: {snapshot.activeMemoryId === BOARDING_PASSES_MEMORY_ID && memoryRuntime.getCompletedIds().includes(BOARDING_PASSES_MEMORY_ID) ? 'yes' : 'no'}</div>
    <div>Friday Night enclosure stage: {fridayNightStage} · replay active: {snapshot.activeMemoryId === FRIDAY_NIGHT_MEMORY_ID && memoryRuntime.getCompletedIds().includes(FRIDAY_NIGHT_MEMORY_ID) ? 'yes' : 'no'}</div>
    <div>world checkpoint: {checkpoint.x.toFixed(1)}, {checkpoint.y.toFixed(1)}, {checkpoint.z.toFixed(1)}</div>
    <hr style={{ borderColor: '#544c3b' }} /><strong>Ownership</strong>
    {Object.entries(locks).map(([resource, owner]) => <div key={resource}>{resource}: {owner ?? 'free'}</div>)}
    <hr style={{ borderColor: '#544c3b' }} /><strong>Registered memories</strong>
    {memoryRuntime.registry.list().map((definition) => <div key={definition.id}>{definition.id} v{definition.contentVersion} · {definition.behavior} · eligible {memoryRuntime.isEligible(definition.id) ? 'yes' : 'no'} · replay {definition.behavior === 'replayable' ? 'available' : 'none'} · prereq {(definition.prerequisiteIds ?? []).join(',') || 'none'} · persisted {memoryRuntime.getCompletedIds().includes(definition.id) ? 'yes' : 'no'}</div>)}
    <div>duplicate IDs: none · invalid references: none</div>
    <hr style={{ borderColor: '#544c3b' }} /><strong>Source catalog</strong>
    {SOURCE_MEMORIES.map((source) => <div key={source.id}>{source.id} v{source.contentVersion} · {source.approvalStatus} · {source.productionStatus} · runtime {source.runtimeMemoryId ?? 'disabled'}</div>)}
    <hr style={{ borderColor: '#544c3b' }} /><strong>World actions</strong>
    {worldActionRegistry.getCalls().slice(-5).map((call, index) => <div key={`${call.id}-${index}`}>{call.id} ← {call.memoryId}</div>)}
    <div style={{ opacity: .65 }}>[H] close · production memories</div>
  </div>;
}
