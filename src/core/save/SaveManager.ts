import { migrateSave } from './migrations';
import { createDefaultSave, type SaveData } from './schema';

const STORAGE_KEY = 'project-taj:save';
const DEBOUNCE_MS = 2000;

/**
 * Owns reading/writing the versioned local save. A plain class (like
 * `AudioManager`) rather than a Zustand store — this is engine-level
 * infrastructure with side effects (localStorage I/O, a debounce timer),
 * not reactive UI state.
 */
class SaveManager {
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;
  private writesSuppressed = false;

  /** Loads and validates the stored save. Returns a fresh default save (not null) on missing/corrupt data — invalid-save recovery. */
  load(): SaveData {
    if (typeof localStorage === 'undefined') return createDefaultSave();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultSave();
      const parsed: unknown = JSON.parse(raw);
      const migrated = migrateSave(parsed);
      return migrated ?? createDefaultSave();
    } catch {
      // Corrupt JSON, storage unavailable, etc. — recover with a fresh save rather than throwing.
      return createDefaultSave();
    }
  }

  /** Writes immediately — used after memory completion and before/during interruption (Part 7/8). */
  saveNow(data: Omit<SaveData, 'savedAt'>): void {
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = null;
    }
    this.write(data);
  }

  /** Debounced write for frequent, low-urgency updates (periodic ticks). */
  saveDebounced(data: Omit<SaveData, 'savedAt'>): void {
    if (this.debounceHandle) clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => {
      this.debounceHandle = null;
      this.write(data);
    }, DEBOUNCE_MS);
  }

  private write(data: Omit<SaveData, 'savedAt'>): void {
    if (this.writesSuppressed || typeof localStorage === 'undefined') return;
    const full: SaveData = { ...data, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {
      // Storage full/unavailable — save is best-effort, never blocks gameplay.
    }
  }

  /** Reset option (Part 7) — clears the stored save entirely. */
  reset(): void {
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = null;
    }
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore — nothing meaningful to recover from here.
    }
  }

  /** Clear progress and ignore unload autosaves until the page reloads. */
  resetForFreshStart(): void {
    this.writesSuppressed = true;
    this.reset();
  }
}

export const saveManager = new SaveManager();
