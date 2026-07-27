import { useEffect } from 'react';
import { useDeviceStore } from '@state/useDeviceStore';

/**
 * Updates the device store's `activeInput` from real events as they happen,
 * so a hybrid touch/mouse device (or a controller plugged in mid-session)
 * is reflected immediately instead of frozen at whatever was detected on
 * first paint. Mount once near the app root.
 */
export function useActiveInputTracking() {
  const setActiveInput = useDeviceStore((state) => state.setActiveInput);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      setActiveInput(event.pointerType === 'touch' ? 'touch' : 'pointer');
    };
    const onTouchStart = () => setActiveInput('touch');
    const onKeyDown = () => setActiveInput('keyboard');
    const onGamepad = () => setActiveInput('gamepad');

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('gamepadconnected', onGamepad);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('gamepadconnected', onGamepad);
    };
  }, [setActiveInput]);
}
