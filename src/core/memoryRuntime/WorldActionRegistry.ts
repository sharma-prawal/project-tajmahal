export interface WorldActionContext { memoryId: string; payload: unknown; }
export interface WorldActionResult { undo?: () => void; }
export type WorldAction = (context: WorldActionContext) => WorldActionResult | void;

export class WorldActionRegistry {
  private readonly actions = new Map<string, WorldAction>();
  private readonly calls: { id: string; memoryId: string }[] = [];
  register(id: string, action: WorldAction): () => void {
    if (!/^[a-z][a-z0-9.-]+$/.test(id)) throw new Error(`Invalid world action id: ${id}`);
    if (this.actions.has(id)) throw new Error(`Duplicate world action id: ${id}`);
    this.actions.set(id, action); return () => { if (this.actions.get(id) === action) this.actions.delete(id); };
  }
  invoke(id: string, context: WorldActionContext): WorldActionResult {
    const action = this.actions.get(id); if (!action) throw new Error(`Missing world action: ${id}`);
    this.calls.push({ id, memoryId: context.memoryId }); if (this.calls.length > 24) this.calls.shift();
    return action(context) ?? {};
  }
  has(id: string): boolean { return this.actions.has(id); }
  getCalls(): readonly { id: string; memoryId: string }[] { return this.calls; }
  reset(): void { this.actions.clear(); this.calls.length = 0; }
}

export const worldActionRegistry = new WorldActionRegistry();
