import type { InteractionContext } from '@core/interaction/types';
import type { RuntimeMemoryDefinition, RuntimeSnapshot, PersistedMemoryCheckpoint, MemoryStep } from './types';
import { MemoryRegistry } from './MemoryRegistry';
import { OwnershipManager, ownershipManager, type OwnershipLease } from './OwnershipManager';
import { WorldActionRegistry, worldActionRegistry } from './WorldActionRegistry';
import { memoryCameraState } from './MemoryCameraState';

const EMPTY: RuntimeSnapshot = { activeMemoryId: null, lifecycle: 'idle', stepId: null, stepIndex: -1, stepElapsedMs: 0, dialogue: null, pendingInput: false, cancellationReason: null, error: null, checkpointStepId: null };

export class MemoryRuntime {
  readonly registry: MemoryRegistry;
  private readonly listeners = new Set<() => void>();
  private readonly persistenceListeners = new Set<() => void>();
  private readonly completed = new Set<string>();
  private readonly flags = new Set<string>();
  private readonly leases: OwnershipLease[] = [];
  private readonly undos: (() => void)[] = [];
  private snapshot: RuntimeSnapshot = EMPTY;
  private definition: RuntimeMemoryDefinition | null = null;
  private sourceInteraction: Pick<InteractionContext, 'complete' | 'cancel'> | null = null;
  private checkpoint: PersistedMemoryCheckpoint | null = null;
  private suspendedFrom: RuntimeSnapshot['lifecycle'] | null = null;

  constructor(private readonly ownership: OwnershipManager = ownershipManager, private readonly actions: WorldActionRegistry = worldActionRegistry) { this.registry = new MemoryRegistry(actions); }
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  subscribePersistence = (listener: () => void): (() => void) => { this.persistenceListeners.add(listener); return () => this.persistenceListeners.delete(listener); };
  getSnapshot = (): RuntimeSnapshot => this.snapshot;
  getServerSnapshot = (): RuntimeSnapshot => EMPTY;
  getCompletedCount = (): number => this.completed.size;
  getCompletedIds = (): string[] => [...this.completed].sort();
  getFlags = (): string[] => [...this.flags].sort();
  getCheckpoint = (): PersistedMemoryCheckpoint | null => this.checkpoint;
  getOwnership = () => this.ownership.snapshot();
  isEligible(id: string): boolean {
    const definition = this.registry.get(id); if (!definition) return false;
    if (definition.behavior === 'one-shot' && this.completed.has(id)) return false;
    return (definition.prerequisiteIds ?? []).every((prerequisite) => this.completed.has(prerequisite));
  }

  activate(id: string, source?: Pick<InteractionContext, 'complete' | 'cancel'>, startIndex = 0): boolean {
    if (this.definition || !this.isEligible(id)) return false;
    const definition = this.registry.get(id); if (!definition) return false;
    this.definition = definition; this.sourceInteraction = source ?? null;
    this.set({ ...EMPTY, activeMemoryId: id, lifecycle: 'preparing', stepIndex: startIndex, stepId: definition.steps[startIndex]?.id ?? null });
    if (startIndex > 0) {
      try { this.restoreExecutionContext(definition, startIndex); }
      catch (error) { this.fail(error instanceof Error ? error.message : String(error)); return true; }
    }
    this.set({ ...this.snapshot, lifecycle: 'active' });
    this.advanceImmediate();
    return true;
  }

  tick(deltaMs: number): void {
    if (!this.definition || this.snapshot.lifecycle === 'suspended' || this.snapshot.lifecycle === 'awaiting-input') return;
    const step = this.currentStep(); if (!step) { this.fail('Sequence ended without explicit completion'); return; }
    if (step.type !== 'wait' && step.type !== 'camera') return;
    this.snapshot = { ...this.snapshot, stepElapsedMs: this.snapshot.stepElapsedMs + Math.max(0, deltaMs) };
    if (step.type === 'camera' && memoryCameraState.command) memoryCameraState.command.elapsedMs = this.snapshot.stepElapsedMs;
    if (this.snapshot.stepElapsedMs >= step.durationMs) this.next();
  }

  acknowledge(): boolean {
    if (this.snapshot.lifecycle !== 'awaiting-input' || this.currentStep()?.type !== 'dialogue') return false;
    this.next(); return true;
  }

  cancel(reason = 'user-cancelled'): boolean {
    if (!this.definition || this.definition.cancellationPolicy === 'deny') return false;
    this.set({ ...this.snapshot, lifecycle: 'cancelling', cancellationReason: reason, dialogue: null, pendingInput: false });
    this.cleanup(true); this.sourceInteraction?.cancel(); this.definition = null; this.sourceInteraction = null; this.checkpoint = null; this.emitPersistence();
    this.set({ ...EMPTY, cancellationReason: reason }); return true;
  }

  suspend(): void { if (!this.definition || this.snapshot.lifecycle === 'suspended') return; this.suspendedFrom = this.snapshot.lifecycle; this.set({ ...this.snapshot, lifecycle: 'suspended' }); }
  resume(): void { if (this.snapshot.lifecycle !== 'suspended') return; this.set({ ...this.snapshot, lifecycle: this.suspendedFrom ?? 'active' }); this.suspendedFrom = null; }

  restore(completedIds: readonly string[], flags: readonly string[], checkpoint: PersistedMemoryCheckpoint | null): void {
    this.completed.clear(); this.flags.clear(); for (const id of completedIds) this.completed.add(id); for (const flag of flags) this.flags.add(flag);
    this.checkpoint = checkpoint; this.finishIdle(); this.emitPersistence();
  }

  tryRestoreCheckpoint(source?: Pick<InteractionContext, 'complete' | 'cancel'>): boolean {
    if (!this.checkpoint) return false;
    const definition = this.registry.get(this.checkpoint.memoryId);
    if (!definition || definition.contentVersion !== this.checkpoint.contentVersion) { this.checkpoint = null; this.emitPersistence(); return false; }
    if (definition.restorePolicy === 'cancel-on-reload') { this.checkpoint = null; this.emitPersistence(); return false; }
    const checkpointIndex = definition.steps.findIndex((step) => step.id === this.checkpoint?.stepId);
    if (checkpointIndex < 0) { this.checkpoint = null; this.emitPersistence(); return false; }
    return this.activate(definition.id, source, definition.restorePolicy === 'restart' ? 0 : checkpointIndex + 1);
  }

  fail(message: string): void {
    if (!this.definition) return;
    this.set({ ...this.snapshot, lifecycle: 'failed', error: message, dialogue: null, pendingInput: false });
    this.cleanup(true); this.sourceInteraction?.cancel(); this.definition = null; this.sourceInteraction = null; this.checkpoint = null; this.emitPersistence();
  }

  reset(): void { this.cleanup(true); this.completed.clear(); this.flags.clear(); this.checkpoint = null; this.definition = null; this.sourceInteraction = null; this.set(EMPTY); }

  private currentStep(): MemoryStep | null { return this.definition?.steps[this.snapshot.stepIndex] ?? null; }
  private restoreExecutionContext(definition: RuntimeMemoryDefinition, startIndex: number): void {
    const required = new Set<string>();
    let cameraStep: Extract<MemoryStep, { type: 'camera' }> | null = null;
    for (const step of definition.steps.slice(0, startIndex)) {
      if (step.type === 'acquire') for (const resource of step.resources) required.add(resource);
      else if (step.type === 'release') for (const resource of step.resources) required.delete(resource);
      else if (step.type === 'camera') cameraStep = step;
    }
    for (const resource of required) {
      const lease = this.ownership.acquire(resource as OwnershipLease['resource'], definition.id);
      if (!lease) throw new Error(`Ownership conflict while restoring: ${resource}`);
      this.leases.push(lease);
    }
    if (cameraStep) memoryCameraState.set({ owner: definition.id, position: cameraStep.position, target: cameraStep.target, durationMs: 0, elapsedMs: 0 });
  }
  private advanceImmediate(): void {
    try {
      while (this.definition) {
        const step = this.currentStep(); if (!step) { this.fail('Missing sequence step'); return; }
        if (step.type === 'dialogue') { this.set({ ...this.snapshot, lifecycle: 'awaiting-input', dialogue: { speaker: step.speaker, text: step.text, continueLabel: step.continueLabel ?? 'Continue', presentation: step.presentation ?? 'standard' }, pendingInput: true }); return; }
        if (step.type === 'wait') { this.set({ ...this.snapshot, lifecycle: 'active', stepElapsedMs: 0 }); return; }
        if (step.type === 'camera') { memoryCameraState.set({ owner: this.definition.id, position: step.position, target: step.target, durationMs: step.durationMs, elapsedMs: 0 }); this.set({ ...this.snapshot, lifecycle: 'active', stepElapsedMs: 0 }); if (step.durationMs > 0) return; }
        if (step.type === 'acquire') { for (const resource of step.resources) { const lease = this.ownership.acquire(resource, this.definition.id); if (!lease) throw new Error(`Ownership conflict: ${resource}`); this.leases.push(lease); } }
        else if (step.type === 'release') this.release(step.resources);
        else if (step.type === 'world-action') { const result = this.actions.invoke(step.actionId, { memoryId: this.definition.id, payload: step.payload }); if (result.undo) this.undos.push(result.undo); }
        else if (step.type === 'checkpoint') { this.checkpoint = { memoryId: this.definition.id, contentVersion: this.definition.contentVersion, stepId: step.id }; this.set({ ...this.snapshot, checkpointStepId: step.id }); this.emitPersistence(); }
        else if (step.type === 'complete') { this.complete(); return; }
        else if (step.type === 'cancel') { this.cancel(step.reason); return; }
        this.increment();
      }
    } catch (error) { this.fail(error instanceof Error ? error.message : String(error)); }
  }
  private next(): void { this.increment(); this.advanceImmediate(); }
  private increment(): void { const index = this.snapshot.stepIndex + 1; this.set({ ...this.snapshot, lifecycle: 'active', stepIndex: index, stepId: this.definition?.steps[index]?.id ?? null, stepElapsedMs: 0, dialogue: null, pendingInput: false }); }
  private complete(): void {
    if (!this.definition) return; const definition = this.definition;
    this.set({ ...this.snapshot, lifecycle: 'completing', dialogue: null, pendingInput: false });
    if (definition.persistence === 'completion') this.completed.add(definition.id);
    for (const flag of definition.completionFlags ?? []) this.flags.add(flag);
    this.checkpoint = null; this.cleanup(false); this.sourceInteraction?.complete();
    this.set({ ...this.snapshot, lifecycle: 'completed' }); this.emitPersistence(); this.definition = null; this.sourceInteraction = null;
  }
  private cleanup(revert: boolean): void { memoryCameraState.clear(this.definition?.id); while (this.leases.length) this.leases.pop()?.release(); if (revert) while (this.undos.length) this.undos.pop()?.(); else this.undos.length = 0; if (this.definition) this.ownership.releaseOwner(this.definition.id); }
  private release(resources: readonly string[]): void { for (let i = this.leases.length - 1; i >= 0; i -= 1) if (resources.includes(this.leases[i].resource)) this.leases.splice(i, 1)[0].release(); }
  private finishIdle(): void { this.definition = null; this.sourceInteraction = null; this.cleanup(true); this.set(EMPTY); }
  private set(snapshot: RuntimeSnapshot): void { this.snapshot = snapshot; for (const listener of this.listeners) listener(); }
  private emitPersistence(): void { for (const listener of this.persistenceListeners) listener(); }
}

export const memoryRuntime = new MemoryRuntime();
