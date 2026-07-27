import { useEffect } from 'react';
import { memoryRuntime } from './MemoryRuntime';
export function MemoryVisibilityPolicy() {
  useEffect(() => {
    const onVisibility = () => document.hidden ? memoryRuntime.suspend() : memoryRuntime.resume();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); if (memoryRuntime.getSnapshot().activeMemoryId) memoryRuntime.cancel('scene-unload'); };
  }, []);
  return null;
}
