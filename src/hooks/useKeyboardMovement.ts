import { useEffect, useRef } from 'react';
import type { MovementInput } from '@/types/input';
import { CLEAR_EXPLORATION_INPUT_EVENT } from '@core/input/clearExplorationInput';

const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACKWARD_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const RUN_KEYS = ['ShiftLeft', 'ShiftRight'];
const MOVEMENT_KEYS = new Set([...FORWARD_KEYS, ...BACKWARD_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...RUN_KEYS]);

function hasAny(codes: Set<string>, candidates: string[]): boolean {
  return candidates.some((code) => codes.has(code));
}

export function createKeyboardMovementTracker() {
  const pressed = new Set<string>();
  const suppressed = new Set<string>();
  const output: MovementInput = { forward: 0, right: 0, running: false };

  const update = () => {
    output.forward = Number(hasAny(pressed, FORWARD_KEYS)) - Number(hasAny(pressed, BACKWARD_KEYS));
    output.right = Number(hasAny(pressed, RIGHT_KEYS)) - Number(hasAny(pressed, LEFT_KEYS));
    output.running = hasAny(pressed, RUN_KEYS);
  };

  return {
    output,
    handle(code: string, isPressed: boolean) {
      if (!MOVEMENT_KEYS.has(code)) return;
      if (isPressed) {
        if (suppressed.has(code)) return;
        pressed.add(code);
      } else {
        pressed.delete(code);
        suppressed.delete(code);
      }
      update();
    },
    clear() {
      pressed.forEach((code) => suppressed.add(code));
      pressed.clear();
      update();
    },
  };
}

/** Tracks WASD/arrow key state and exposes a ref-based movement vector to avoid rerenders. */
export function useKeyboardMovement() {
  const tracker = useRef(createKeyboardMovementTracker());
  const output = useRef<MovementInput>({ forward: 0, right: 0, running: false });

  useEffect(() => {
    const handleKey = (pressed: boolean) => (event: KeyboardEvent) => {
      tracker.current.handle(event.code, pressed);
      output.current = tracker.current.output;
    };

    const onKeyDown = handleKey(true);
    const onKeyUp = handleKey(false);

    // A key held down when the window loses focus (alt-tab, iframe blur,
    // tab switch) never gets its keyup — without this the player would
    // walk forever. Reset all state whenever focus/visibility is lost.
    const releaseAll = () => {
      tracker.current.clear();
      output.current = tracker.current.output;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof HTMLCanvasElement)) releaseAll();
    };
    const onVisibilityChange = () => {
      if (document.hidden) releaseAll();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener(CLEAR_EXPLORATION_INPUT_EVENT, releaseAll);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener(CLEAR_EXPLORATION_INPUT_EVENT, releaseAll);
    };
  }, []);

  return output;
}
