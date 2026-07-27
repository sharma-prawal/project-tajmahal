import { useSyncExternalStore } from 'react';
import { memoryRuntime } from './MemoryRuntime';
export function useMemoryRuntimeSnapshot() { return useSyncExternalStore(memoryRuntime.subscribe, memoryRuntime.getSnapshot, memoryRuntime.getServerSnapshot); }
export function useMemoryRuntimeCompletedCount() { return useSyncExternalStore(memoryRuntime.subscribePersistence, memoryRuntime.getCompletedCount, () => 0); }
