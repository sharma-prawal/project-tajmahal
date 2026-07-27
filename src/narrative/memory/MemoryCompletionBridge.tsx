import { useEffect } from 'react';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { env } from '@config/env';
import { spatialMemoryForProduction, validateMemoryMapping } from './memoryMapping';
import { useMemoryStore } from './useMemoryStore';

/**
 * Phase 10E.1 — one-way bridge: a completed narrative lights its landmark.
 *
 * Subscribes to System B's persistence signal (the same one `useAutoSave`
 * already uses, so this adds no new notification path) and, for the mappings
 * the contract marks `proven`, marks the corresponding System A memory
 * complete. That lights the chirag and, through the existing
 * `memoryGateProgress`, is already accounted for at the door.
 *
 * **Strictly one-way.** Nothing here reads System A and writes System B. A
 * spine dwell can never fabricate a narrative the player did not watch; only a
 * genuinely completed sequence can light a lamp.
 *
 * **Idempotent and monotonic.** It uses `restoreCompleted`, not `complete`.
 * That is not a style choice: `nextPhase` only accepts `complete` from
 * `revealing`, so calling `complete()` on an `idle` spine memory is a **silent
 * no-op** and the lamp would never have lit. `restoreCompleted` is the method
 * whose documented job is exactly this — "restores completed memories WITHOUT
 * replaying their interactions" — and it only ever sets phases to `complete`,
 * so a lit lamp cannot be put out by a later runtime event, including a
 * cancelled replay.
 *
 * **Safe when a mapping is absent.** Five of the seven narratives are
 * deliberately unmapped; their completions flow through here and do nothing,
 * which is the correct behaviour until a human decides where they belong.
 *
 * **Safe when content is renamed or removed.** The lookup is by id and returns
 * `null` for anything it does not recognise. Structural mistakes in the
 * contract itself are reported once, in development only.
 */
export function MemoryCompletionBridge() {
  useEffect(() => {
    if (env.enableDebugTools) {
      const problems = validateMemoryMapping();
      if (problems.length > 0) {
        console.warn(`[memory-mapping] ${problems.length} contract problem(s):\n  ${problems.join('\n  ')}`);
      }
    }

    const sync = () => {
      const store = useMemoryStore.getState();
      const newlyComplete = memoryRuntime
        .getCompletedIds()
        .map(spatialMemoryForProduction)
        .filter((id): id is NonNullable<typeof id> => id !== null && store.phases[id] !== 'complete');
      // One store write per change, so a run of completions cannot emit a
      // burst of duplicate save-triggering updates.
      if (newlyComplete.length > 0) store.restoreCompleted(newlyComplete);
    };

    // Run once for a save restored before this mounted, then on every change.
    sync();
    return memoryRuntime.subscribePersistence(sync);
  }, []);

  return null;
}
