import type { OwnershipResource } from './types';

export interface OwnershipLease { resource: OwnershipResource; owner: string; release: () => void; }

export class OwnershipManager {
  private readonly owners = new Map<OwnershipResource, string>();
  private readonly listeners = new Set<() => void>();
  acquire(resource: OwnershipResource, owner: string): OwnershipLease | null {
    const current = this.owners.get(resource);
    if (current && current !== owner) return null;
    this.owners.set(resource, owner); this.emit();
    let released = false;
    return { resource, owner, release: () => { if (released) return; released = true; if (this.owners.get(resource) === owner) { this.owners.delete(resource); this.emit(); } } };
  }
  ownerOf(resource: OwnershipResource): string | null { return this.owners.get(resource) ?? null; }
  isOwned(resource: OwnershipResource): boolean { return this.owners.has(resource); }
  releaseOwner(owner: string): void { for (const [resource, value] of this.owners) if (value === owner) this.owners.delete(resource); this.emit(); }
  snapshot(): Readonly<Record<OwnershipResource, string | null>> { return { traversal: this.ownerOf('traversal'), camera: this.ownerOf('camera'), interaction: this.ownerOf('interaction'), 'narrative-input': this.ownerOf('narrative-input'), 'modal-ui': this.ownerOf('modal-ui') }; }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  reset(): void { this.owners.clear(); this.emit(); }
  private emit(): void { for (const listener of this.listeners) listener(); }
}

export const ownershipManager = new OwnershipManager();
