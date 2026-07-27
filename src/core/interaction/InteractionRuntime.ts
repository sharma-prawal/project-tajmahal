import type {
  InteractionCandidate,
  InteractionDiagnostic,
  InteractionLifecycle,
  InteractionLifecycleEvent,
  InteractionObserver,
  InteractionPromptSnapshot,
} from './types';
import { InteractionRegistry } from './InteractionRegistry';
import { selectInteraction } from './selection';
import { isValidInteractionId } from './validation';

const EMPTY_PROMPT: InteractionPromptSnapshot = {
  focusedId: null,
  prompt: null,
  accessibilityLabel: null,
  lifecycle: 'idle',
  canActivate: false,
  completed: false,
};

export class InteractionRuntime {
  readonly registry = new InteractionRegistry();
  private readonly listeners = new Set<() => void>();
  private readonly persistenceListeners = new Set<() => void>();
  private readonly completedIds = new Set<string>();
  private readonly persistedCompletedIds = new Set<string>();
  private readonly discoveredIds = new Set<string>();
  private lifecycle: InteractionLifecycle = 'idle';
  private focus: InteractionCandidate | null = null;
  private cooldownEndsAt = 0;
  private prompt: InteractionPromptSnapshot = EMPTY_PROMPT;
  private diagnostics: InteractionDiagnostic[] = [];
  private readonly events: InteractionLifecycleEvent[] = [];

  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  subscribePersistence = (listener: () => void): (() => void) => { this.persistenceListeners.add(listener); return () => this.persistenceListeners.delete(listener); };
  getSnapshot = (): InteractionPromptSnapshot => this.prompt;
  getServerSnapshot = (): InteractionPromptSnapshot => EMPTY_PROMPT;
  getDiagnostics = (): readonly InteractionDiagnostic[] => this.diagnostics;
  getEvents = (): readonly InteractionLifecycleEvent[] => this.events;
  getCompletedIds = (): string[] => [...this.persistedCompletedIds].sort();
  getDiscoveredIds = (): string[] => [...this.discoveredIds].sort();

  update(observer: InteractionObserver, now: number, collectDiagnostics = false): void {
    if (this.lifecycle === 'cooldown' && now >= this.cooldownEndsAt) {
      this.transition('idle', 'cooldown-ended', now);
      this.focus = null;
    }
    const result = selectInteraction(this.registry.values(), observer, this.completedIds, this.focus?.id ?? null, this.persistedCompletedIds);
    if (collectDiagnostics) this.diagnostics = result.diagnostics;
    if (this.lifecycle === 'active' || this.lifecycle === 'activating') {
      const currentEligible = this.focus && result.diagnostics.find((item) => item.id === this.focus?.id)?.eligible;
      if (!currentEligible) this.interruptForExit(now);
      return;
    }
    if (this.lifecycle === 'completing') return;
    if (this.lifecycle === 'cooldown') return;

    if (result.selected?.id === this.focus?.id) return;
    if (this.focus) this.transition('idle', 'focus-lost', now);
    this.focus = result.selected;
    if (this.focus) {
      const discoveredBefore = this.discoveredIds.has(this.focus.id);
      this.discoveredIds.add(this.focus.id);
      if (!discoveredBefore) this.emitPersistence();
      this.transition('focused', 'eligible', now);
    }
    this.publish();
  }

  activate(now = performance.now()): boolean {
    if (this.lifecycle !== 'focused' || !this.focus) return false;
    const definition = this.registry.get(this.focus.id);
    if (!definition || definition.enabled === false) return false;
    if (definition.behavior === 'one-shot' && this.completedIds.has(definition.id)) return false;

    const completedBefore = this.completedIds.has(definition.id);
    this.transition('activating', 'press', now);
    this.transition('active', 'callback-start', now);
    definition.onActivate?.({
      id: definition.id,
      payload: definition.payload,
      completedBefore,
      complete: () => this.complete(),
      cancel: () => this.cancel(),
    });
    if (definition.completion === 'manual' || !this.isActive()) {
      this.publish();
      return true;
    }
    return this.complete(now);
  }

  complete(now = performance.now()): boolean {
    if (this.lifecycle !== 'active' || !this.focus) return false;
    const definition = this.registry.get(this.focus.id);
    if (!definition) return false;
    this.transition('completing', 'callback-complete', now);
    this.completedIds.add(definition.id);
    if (definition.persistence === 'completion') {
      this.persistedCompletedIds.add(definition.id);
      this.emitPersistence();
    }
    if (definition.behavior === 'one-shot') {
      this.transition('completed', 'one-shot-complete', now);
      this.focus = null;
    } else {
      this.cooldownEndsAt = now + (definition.cooldownMs ?? 500);
      this.transition('cooldown', 'repeatable-cooldown', now);
    }
    this.publish();
    return true;
  }

  completeRestored(id: string): boolean {
    const definition = this.registry.get(id);
    if (!definition || !isValidInteractionId(id)) return false;
    const changed = !this.persistedCompletedIds.has(id);
    this.completedIds.add(id);
    if (definition.persistence === 'completion') this.persistedCompletedIds.add(id);
    if (changed) this.emitPersistence();
    this.publish();
    return true;
  }

  cancel(now = performance.now()): boolean {
    if (this.lifecycle !== 'active' && this.lifecycle !== 'activating') return false;
    const definition = this.focus ? this.registry.get(this.focus.id) : undefined;
    if (definition?.interruption === 'ignore') return false;
    if (definition?.interruption === 'complete-on-exit') this.transition('completing', 'cancel-completes', now);
    else { this.transition('cancelled', 'cancel', now); this.focus = null; }
    this.publish();
    return true;
  }

  restore(completedIds: readonly string[], discoveredIds: readonly string[]): void {
    this.completedIds.clear();
    this.persistedCompletedIds.clear();
    this.discoveredIds.clear();
    for (const id of completedIds) if (isValidInteractionId(id)) { this.completedIds.add(id); this.persistedCompletedIds.add(id); }
    for (const id of discoveredIds) if (isValidInteractionId(id)) this.discoveredIds.add(id);
    this.focus = null;
    this.lifecycle = 'idle';
    this.publish();
  }

  reset(): void {
    this.completedIds.clear(); this.persistedCompletedIds.clear(); this.discoveredIds.clear(); this.focus = null; this.lifecycle = 'idle';
    this.cooldownEndsAt = 0; this.events.length = 0; this.diagnostics = []; this.publish();
  }

  private transition(to: InteractionLifecycle, reason: string, at: number): void {
    if (to === this.lifecycle) return;
    this.events.push({ id: this.focus?.id ?? null, from: this.lifecycle, to, reason, at });
    if (this.events.length > 24) this.events.shift();
    this.lifecycle = to;
  }

  private isActive(): boolean { return this.lifecycle === 'active'; }

  private interruptForExit(now: number): void {
    const definition = this.focus ? this.registry.get(this.focus.id) : undefined;
    const policy = definition?.interruption ?? 'cancel-on-exit';
    if (policy === 'ignore') return;
    if (policy === 'complete-on-exit') { this.complete(now); return; }
    this.transition('cancelled', 'eligibility-lost', now);
    this.focus = null;
    this.publish();
  }

  private publish(): void {
    const definition = this.focus ? this.registry.get(this.focus.id) : undefined;
    const next: InteractionPromptSnapshot = definition
      ? {
          focusedId: definition.id,
          prompt: this.completedIds.has(definition.id) ? definition.completedPrompt ?? definition.prompt : definition.prompt,
          accessibilityLabel: this.completedIds.has(definition.id) ? definition.completedAccessibilityLabel ?? definition.accessibilityLabel : definition.accessibilityLabel,
          lifecycle: this.lifecycle,
          canActivate: this.lifecycle === 'focused',
          completed: this.completedIds.has(definition.id),
        }
      : { ...EMPTY_PROMPT, lifecycle: this.lifecycle };
    if (
      next.focusedId === this.prompt.focusedId && next.lifecycle === this.prompt.lifecycle
      && next.canActivate === this.prompt.canActivate && next.completed === this.prompt.completed
    ) return;
    this.prompt = next;
    for (const listener of this.listeners) listener();
  }

  private emitPersistence(): void { for (const listener of this.persistenceListeners) listener(); }
}

export const interactionRuntime = new InteractionRuntime();
