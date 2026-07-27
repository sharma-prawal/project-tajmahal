import { useEffect } from 'react';
import { interactionRuntime } from './InteractionRuntime';
import { PressLatch } from './pressLatch';
import { ownershipManager } from '@core/memoryRuntime/OwnershipManager';
import { clearExplorationInput } from '@core/input/clearExplorationInput';
import { isExplorationModalOpen } from '@state/useExperienceSettingsStore';

export function InteractionInput() {
  useEffect(() => {
    const latch = new PressLatch();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') { interactionRuntime.cancel(); return; }
      if (isExplorationModalOpen()) return;
      if (ownershipManager.isOwned('interaction')) return;
      if (event.code !== 'KeyE' && event.code !== 'Enter') return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, button, [contenteditable="true"]')) return;
      if (!latch.down(event.repeat)) return;
      if (interactionRuntime.activate()) {
        clearExplorationInput();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'KeyE' || event.code === 'Enter') latch.up();
    };
    const reset = () => latch.reset();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', reset);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', reset); };
  }, []);
  return null;
}
