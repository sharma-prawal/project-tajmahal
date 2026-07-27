import { useEffect, useRef, useSyncExternalStore } from 'react';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { BACK_MEMORY_ID } from '@core/memoryRuntime/backMemoryDefinition';
import { BOARDING_PASSES_MEMORY_ID } from '@core/memoryRuntime/boardingPassesMemoryDefinition';
import { FRIDAY_NIGHT_MEMORY_ID } from '@core/memoryRuntime/fridayNightMemoryDefinition';
import { ALL_DAY_CALL_MEMORY_ID } from '@core/memoryRuntime/allDayCallMemoryDefinition';
import { MINTS_MEMORY_ID } from '@core/memoryRuntime/mintsMemoryDefinition';
import { UMBRELLA_MEMORY_ID } from '@core/memoryRuntime/umbrellaMemoryDefinition';
import { LITTLE_DETAILS_MEMORY_ID } from '@core/memoryRuntime/littleDetailsMemoryDefinition';
import { requestFinalLetterReopen } from '@narrative/finale/finalLetterReopen';

const JOURNAL_ENTRIES = [
  { id: MINTS_MEMORY_ID, title: 'Warmth in Absence' },
  { id: BOARDING_PASSES_MEMORY_ID, title: 'The Birthday Gift' },
  { id: UMBRELLA_MEMORY_ID, title: 'Fried Rice & Love' },
  { id: BACK_MEMORY_ID, title: 'A Touch of Sanity' },
  { id: LITTLE_DETAILS_MEMORY_ID, title: 'The Careless Days' },
  { id: ALL_DAY_CALL_MEMORY_ID, title: 'Through Every Emotion' },
  { id: FRIDAY_NIGHT_MEMORY_ID, title: 'Family & Blessings' },
] as const;

// `memoryRuntime.getCompletedIds()` allocates a fresh array every call, which
// breaks `useSyncExternalStore`'s "same snapshot => same reference" contract
// and spins into a render loop. Cache by content so repeated calls between
// actual completions return the identical array.
let cachedCompletedIds: string[] = [];
function getCachedCompletedIds(): string[] {
  const next = memoryRuntime.getCompletedIds();
  if (next.length !== cachedCompletedIds.length || next.some((id, i) => id !== cachedCompletedIds[i])) {
    cachedCompletedIds = next;
  }
  return cachedCompletedIds;
}

function useCompletedIds(): string[] {
  return useSyncExternalStore(
    memoryRuntime.subscribePersistence,
    getCachedCompletedIds,
    getCachedCompletedIds,
  );
}

interface MemoriesJournalProps {
  onClose: () => void;
}

/**
 * A persistent place to check memory progress and reread the finale letter —
 * separate from the one-shot recovery toast, which never keeps history.
 */
export function MemoriesJournal({ onClose }: MemoriesJournalProps) {
  const completedIds = useCompletedIds();
  const completedSet = new Set(completedIds);
  const completedCount = JOURNAL_ENTRIES.filter((entry) => completedSet.has(entry.id)).length;
  const allComplete = completedCount === JOURNAL_ENTRIES.length;
  const rootRef = useRef<HTMLElement>(null);
  // A fresh open should always start at the top of the list, never wherever
  // the browser's scroll-anchoring last landed.
  useEffect(() => { if (rootRef.current) rootRef.current.scrollTop = 0; }, []);

  return (
    <section ref={rootRef} className="premium-modal" role="dialog" aria-modal="true" aria-labelledby="journal-title">
      <div className="modal-heading">
        <div>
          <div className="modal-kicker">{completedCount} of {JOURNAL_ENTRIES.length} recovered</div>
          <h1 id="journal-title">Memories</h1>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close memories">×</button>
      </div>
      <ul className="memories-journal-list">
        {JOURNAL_ENTRIES.map((entry) => {
          const complete = completedSet.has(entry.id);
          return (
            <li key={entry.id} data-complete={complete}>
              <span className="memories-journal-list__mark" aria-hidden="true" />
              <span className="memories-journal-list__title">{entry.title}</span>
              {complete
                ? <button
                    type="button"
                    className="memories-journal-list__replay"
                    onClick={() => {
                      memoryRuntime.cancel('user-cancelled');
                      memoryRuntime.activate(entry.id);
                      onClose();
                    }}
                  >
                    Watch again
                  </button>
                : <span className="memories-journal-list__status">Not yet found</span>}
            </li>
          );
        })}
      </ul>
      <div className="modal-actions">
        {allComplete
          ? <button type="button" className="button-primary" onClick={() => { requestFinalLetterReopen(); onClose(); }}>Read the letter again</button>
          : <span className="memories-journal-hint">Find every memory to unlock the final letter.</span>}
        <button type="button" className="button-quiet" onClick={onClose}>Close</button>
      </div>
    </section>
  );
}
