import { useEffect, useMemo, useState } from 'react';
import { audioManager } from '@core/audio/AudioManager';
import { memoryRuntime } from '@core/memoryRuntime/MemoryRuntime';
import { env } from '@config/env';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import {
  JOURNAL_MEMORY_COUNT,
  journalCopy,
  recoveredMemoryCount,
} from './memoryJournalModel';

interface JournalEntry {
  count: number;
  token: number;
}

function previewCount(): number | null {
  if (!env.enableDebugTools) return null;
  const value = Number(new URLSearchParams(window.location.search).get('journalPreview'));
  return Number.isInteger(value) && value >= 1 && value <= JOURNAL_MEMORY_COUNT ? value : null;
}

/**
 * A non-interrupting keepsake toast shown after a newly recovered memory.
 * It never owns input, pauses play, or exposes undiscovered memory content.
 */
export function MemoryJournalToast() {
  const preview = useMemo(previewCount, []);
  const [entry, setEntry] = useState<JournalEntry | null>(
    preview ? { count: preview, token: 0 } : null,
  );
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);

  useEffect(() => {
    if (preview) return;
    let unsubscribe: (() => void) | undefined;
    // Subscribe to completed *narrative* memories after hydration. Proximity
    // landmarks have their own discovery phases and must never impersonate a
    // recovered journal memory merely because the player stood beside one.
    // A reload must not replay moments already restored from the save.
    const frame = requestAnimationFrame(() => {
      let previous = memoryRuntime.getCompletedIds().length;
      unsubscribe = memoryRuntime.subscribePersistence(() => {
        const next = memoryRuntime.getCompletedIds().length;
        const recovered = recoveredMemoryCount(previous, next);
        previous = next;
        if (recovered === null) return;
        setEntry((current) => ({ count: recovered, token: (current?.token ?? 0) + 1 }));
        audioManager.playJournalRecovery();
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe?.();
    };
  }, [preview]);

  if (!entry) return null;
  const copy = journalCopy(entry.count);

  return (
    <section
      key={entry.token}
      className="memory-journal-toast"
      data-preview={preview ? 'true' : 'false'}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="status"
      aria-live="polite"
      aria-label={`${entry.count} of ${JOURNAL_MEMORY_COUNT} memories recovered. ${copy[0]} ${copy[1]}`}
    >
      <div className="memory-journal-toast__kicker">Memory Journal</div>
      <div className="memory-journal-toast__marks" aria-hidden="true">
        {Array.from({ length: JOURNAL_MEMORY_COUNT }, (_, index) => {
          const filled = index < entry.count;
          const newlyRecovered = index === entry.count - 1;
          return (
            <span
              key={index}
              className="memory-journal-toast__mark"
              data-filled={filled ? 'true' : 'false'}
              data-recovered={newlyRecovered ? 'true' : 'false'}
            />
          );
        })}
      </div>
      <p>{copy[0]}</p>
      <span>{copy[1]}</span>
    </section>
  );
}
