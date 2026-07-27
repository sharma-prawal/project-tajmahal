import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSave, type SaveData } from './schema';

function withoutSavedAt(save: SaveData): Omit<SaveData, 'savedAt'> {
  const clone: Partial<SaveData> = { ...save };
  delete clone.savedAt;
  return clone as Omit<SaveData, 'savedAt'>;
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('SaveManager', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns a default save when nothing is stored', async () => {
    const { saveManager } = await import('./SaveManager');
    const loaded = saveManager.load();
    expect(loaded.completedMemoryIds).toEqual([]);
  });

  it('round-trips a save via saveNow + load', async () => {
    const { saveManager } = await import('./SaveManager');
    const data = { ...createDefaultSave(), completedMemoryIds: ['m3' as const, 'm6' as const] };
    saveManager.saveNow(withoutSavedAt(data));
    const loaded = saveManager.load();
    expect(loaded.completedMemoryIds).toEqual(['m3', 'm6']);
  });

  it('recovers gracefully from corrupt JSON in storage (invalid-save recovery)', async () => {
    localStorage.setItem('project-taj:save', '{not valid json');
    const { saveManager } = await import('./SaveManager');
    const loaded = saveManager.load();
    expect(loaded.completedMemoryIds).toEqual([]);
  });

  it('debounces saveDebounced — only the last call within the window is written', async () => {
    const { saveManager } = await import('./SaveManager');
    const a = { ...createDefaultSave(), completedMemoryIds: ['m1' as const] };
    const b = { ...createDefaultSave(), completedMemoryIds: ['m1' as const, 'm2' as const] };

    saveManager.saveDebounced(withoutSavedAt(a));
    saveManager.saveDebounced(withoutSavedAt(b));
    await vi.advanceTimersByTimeAsync(3000);

    const loaded = saveManager.load();
    expect(loaded.completedMemoryIds).toEqual(['m1', 'm2']);
  });

  it('reset clears the stored save', async () => {
    const { saveManager } = await import('./SaveManager');
    const data = { ...createDefaultSave(), completedMemoryIds: ['m1' as const] };
    saveManager.saveNow(withoutSavedAt(data));
    saveManager.reset();
    const loaded = saveManager.load();
    expect(loaded.completedMemoryIds).toEqual([]);
  });

  it('fresh-start reset cannot be undone by a trailing unload save', async () => {
    const { saveManager } = await import('./SaveManager');
    const data = createDefaultSave();
    saveManager.saveNow(withoutSavedAt(data));
    saveManager.resetForFreshStart();
    saveManager.saveNow(withoutSavedAt(data));
    expect(localStorage.getItem('project-taj:save')).toBeNull();
  });
});
