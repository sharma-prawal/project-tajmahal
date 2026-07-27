import { useEffect, useRef } from 'react';
import type { LookDelta } from '@/types/input';
import { CLEAR_EXPLORATION_INPUT_EVENT } from '@core/input/clearExplorationInput';

/**
 * Captures pointer-lock mouse-look deltas.
 * Click on `target` to engage pointer lock; Escape releases it (browser default).
 */
export function useMouseLook(target: HTMLElement | null) {
  const delta = useRef<LookDelta>({ dx: 0, dy: 0 });
  const locked = useRef(false);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!target) return;

    const onDoubleClick = () => {
      if (document.pointerLockElement !== target) {
        const request = target.requestPointerLock();
        if (request && 'catch' in request) void request.catch(() => { /* Pointer lock may be denied in embedded/headless contexts. */ });
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || (event.button !== 0 && event.button !== 2)) return;
      dragging.current = true; last.current.x = event.clientX; last.current.y = event.clientY;
      target.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current || locked.current || event.pointerType === 'touch') return;
      delta.current.dx += event.clientX - last.current.x; delta.current.dy += event.clientY - last.current.y;
      last.current.x = event.clientX; last.current.y = event.clientY;
    };
    const endDrag = () => { dragging.current = false; };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const clear = () => { dragging.current = false; delta.current.dx = 0; delta.current.dy = 0; if (document.pointerLockElement === target) void document.exitPointerLock(); };

    const onLockChange = () => {
      locked.current = document.pointerLockElement === target;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!locked.current) return;
      delta.current.dx += event.movementX;
      delta.current.dy += event.movementY;
    };

    target.addEventListener('dblclick', onDoubleClick);
    target.addEventListener('pointerdown', onPointerDown);
    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', endDrag);
    target.addEventListener('pointercancel', endDrag);
    target.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener(CLEAR_EXPLORATION_INPUT_EVENT, clear);

    return () => {
      target.removeEventListener('dblclick', onDoubleClick);
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', endDrag);
      target.removeEventListener('pointercancel', endDrag);
      target.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener(CLEAR_EXPLORATION_INPUT_EVENT, clear);
    };
  }, [target]);

  const consumeInto = (value: LookDelta): LookDelta => {
    value.dx = delta.current.dx;
    value.dy = delta.current.dy;
    delta.current.dx = 0;
    delta.current.dy = 0;
    return value;
  };

  return { consumeInto, isLocked: () => locked.current };
}
