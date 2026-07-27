import { useEffect, useRef } from 'react';
import { JOYSTICK } from '@constants/movement';
import { TOUCH_REGIONS } from '@constants/touchRegions';
import { clamp } from '@utils/math';
import type { LookDelta, MovementInput } from '@/types/input';
import { CLEAR_EXPLORATION_INPUT_EVENT } from '@core/input/clearExplorationInput';

interface TouchPoint {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
}

/**
 * Two-zone touch scheme: left half of the screen drives a virtual joystick
 * (movement), right half drives look via drag delta. `joystickOrigin` is
 * exposed so a placeholder UI can render the stick under the player's thumb.
 */
export function useTouchControls(target: HTMLElement | null) {
  const movement = useRef<MovementInput>({ forward: 0, right: 0, running: false });
  const look = useRef<LookDelta>({ dx: 0, dy: 0 });
  const joystickOrigin = useRef<{ x: number; y: number } | null>(null);
  const joystickTouch = useRef<TouchPoint | null>(null);
  const lookTouch = useRef<TouchPoint | null>(null);

  useEffect(() => {
    if (!target) return;

    const isLeftSide = (x: number) => x < window.innerWidth * TOUCH_REGIONS.movementZoneFraction;

    const onTouchStart = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        const point: TouchPoint = {
          id: touch.identifier,
          startX: touch.clientX,
          startY: touch.clientY,
          x: touch.clientX,
          y: touch.clientY,
        };
        if (isLeftSide(touch.clientX) && !joystickTouch.current) {
          joystickTouch.current = point;
          joystickOrigin.current = { x: touch.clientX, y: touch.clientY };
        } else if (!isLeftSide(touch.clientX) && !lookTouch.current) {
          lookTouch.current = point;
        }
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        if (joystickTouch.current?.id === touch.identifier) {
          const jt = joystickTouch.current;
          jt.x = touch.clientX;
          jt.y = touch.clientY;

          const dx = clamp(jt.x - jt.startX, -JOYSTICK.maxRadius, JOYSTICK.maxRadius);
          const dy = clamp(jt.y - jt.startY, -JOYSTICK.maxRadius, JOYSTICK.maxRadius);
          const nx = dx / JOYSTICK.maxRadius;
          const ny = dy / JOYSTICK.maxRadius;

          movement.current.right = Math.abs(nx) > JOYSTICK.deadzone ? nx : 0;
          movement.current.forward = Math.abs(ny) > JOYSTICK.deadzone ? -ny : 0;
        } else if (lookTouch.current?.id === touch.identifier) {
          const lt = lookTouch.current;
          // Raw pixel delta, same convention as useMouseLook's movementX/Y —
          // the consumer applies TOUCH_LOOK.sensitivity, not this hook.
          look.current.dx += touch.clientX - lt.x;
          look.current.dy += touch.clientY - lt.y;
          lt.x = touch.clientX;
          lt.y = touch.clientY;
        }
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        if (joystickTouch.current?.id === touch.identifier) {
          joystickTouch.current = null;
          joystickOrigin.current = null;
          movement.current.forward = 0;
          movement.current.right = 0;
        }
        if (lookTouch.current?.id === touch.identifier) {
          lookTouch.current = null;
        }
      }
    };

    // Orientation changes / backgrounding can end touches without ever
    // delivering a touchend/touchcancel for them — release everything so a
    // joystick or look drag never gets stuck active (Part 8/9).
    const releaseAll = () => {
      joystickTouch.current = null;
      lookTouch.current = null;
      joystickOrigin.current = null;
      movement.current.forward = 0;
      movement.current.right = 0;
    };
    const onVisibilityChange = () => {
      if (document.hidden) releaseAll();
    };

    target.addEventListener('touchstart', onTouchStart, { passive: true });
    target.addEventListener('touchmove', onTouchMove, { passive: true });
    target.addEventListener('touchend', onTouchEnd, { passive: true });
    target.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('orientationchange', releaseAll);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener(CLEAR_EXPLORATION_INPUT_EVENT, releaseAll);

    return () => {
      target.removeEventListener('touchstart', onTouchStart);
      target.removeEventListener('touchmove', onTouchMove);
      target.removeEventListener('touchend', onTouchEnd);
      target.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('orientationchange', releaseAll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener(CLEAR_EXPLORATION_INPUT_EVENT, releaseAll);
    };
  }, [target]);

  const consumeLookInto = (value: LookDelta): LookDelta => {
    value.dx = look.current.dx;
    value.dy = look.current.dy;
    look.current.dx = 0;
    look.current.dy = 0;
    return value;
  };

  return { movement, consumeLookInto, joystickOrigin };
}
