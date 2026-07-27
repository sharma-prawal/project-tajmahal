import type { InteractionDefinition } from './types';
import { validateInteractionDefinition } from './validation';

export class InteractionRegistry {
  private readonly definitions = new Map<string, InteractionDefinition>();
  private readonly listeners = new Set<() => void>();

  register(definition: InteractionDefinition): () => void {
    validateInteractionDefinition(definition);
    if (this.definitions.has(definition.id)) throw new Error(`Duplicate interaction id: ${definition.id}`);
    this.definitions.set(definition.id, definition);
    this.emit();
    return () => {
      if (this.definitions.get(definition.id) !== definition) return;
      this.definitions.delete(definition.id);
      this.emit();
    };
  }

  get(id: string): InteractionDefinition | undefined { return this.definitions.get(id); }
  values(): IterableIterator<InteractionDefinition> { return this.definitions.values(); }
  list(): InteractionDefinition[] { return [...this.definitions.values()].sort((a, b) => a.id.localeCompare(b.id)); }
  get size(): number { return this.definitions.size; }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  clear(): void { this.definitions.clear(); this.emit(); }
  private emit(): void { for (const listener of this.listeners) listener(); }
}
