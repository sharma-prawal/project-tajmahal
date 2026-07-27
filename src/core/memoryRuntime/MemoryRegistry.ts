import type { RuntimeMemoryDefinition } from './types';
import type { WorldActionRegistry } from './WorldActionRegistry';

const ID = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
export class MemoryRegistry {
  private readonly definitions = new Map<string, RuntimeMemoryDefinition>();
  constructor(private readonly actions?: WorldActionRegistry) {}
  register(definition: RuntimeMemoryDefinition): () => void {
    this.validate(definition);
    if (this.definitions.has(definition.id)) throw new Error(`Duplicate memory id: ${definition.id}`);
    this.definitions.set(definition.id, definition);
    try { this.validateReferences(); } catch (error) { this.definitions.delete(definition.id); throw error; }
    return () => { if (this.definitions.get(definition.id) === definition) this.definitions.delete(definition.id); };
  }
  get(id: string): RuntimeMemoryDefinition | undefined { return this.definitions.get(id); }
  list(): RuntimeMemoryDefinition[] { return [...this.definitions.values()].sort((a, b) => a.id.localeCompare(b.id)); }
  validateReferences(): void {
    for (const definition of this.definitions.values()) for (const prerequisite of definition.prerequisiteIds ?? []) if (!this.definitions.has(prerequisite)) throw new Error(`Memory ${definition.id} references missing prerequisite ${prerequisite}`);
  }
  private validate(definition: RuntimeMemoryDefinition): void {
    if (!ID.test(definition.id) || !ID.test(definition.triggerInteractionId)) throw new Error(`Invalid memory or trigger id: ${definition.id}`);
    if (!Number.isInteger(definition.contentVersion) || definition.contentVersion < 1) throw new Error(`Invalid content version: ${definition.id}`);
    if (!definition.steps.length) throw new Error(`Memory ${definition.id} has no steps`);
    const ids = new Set<string>();
    for (const [index, step] of definition.steps.entries()) {
      if (!ID.test(step.id) || ids.has(step.id)) throw new Error(`Invalid or duplicate step id: ${step.id}`); ids.add(step.id);
      if (step.type === 'wait' && (!Number.isFinite(step.durationMs) || step.durationMs < 0)) throw new Error(`Invalid wait: ${step.id}`);
      if (step.type === 'camera' && (!Number.isFinite(step.durationMs) || step.durationMs < 0 || !step.target.every(Number.isFinite) || !step.position.every(Number.isFinite))) throw new Error(`Invalid camera step: ${step.id}`);
      if (step.type === 'world-action' && this.actions && !this.actions.has(step.actionId)) throw new Error(`Missing world action: ${step.actionId}`);
      if ((step.type === 'complete' || step.type === 'cancel') && index !== definition.steps.length - 1) throw new Error(`Memory ${definition.id} contains unreachable steps`);
    }
    if (definition.steps.at(-1)?.type !== 'complete' && definition.steps.at(-1)?.type !== 'cancel') throw new Error(`Memory ${definition.id} must terminate explicitly`);
  }
}
