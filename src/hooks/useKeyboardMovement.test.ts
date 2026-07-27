import { describe, expect, it } from 'vitest';
import { createKeyboardMovementTracker } from './useKeyboardMovement';

describe('keyboard movement cancellation', () => {
  it('suppresses a held key after UI cancellation until it is released', () => {
    const tracker = createKeyboardMovementTracker();

    tracker.handle('KeyW', true);
    expect(tracker.output.forward).toBe(1);

    tracker.clear();
    tracker.handle('KeyW', true);
    expect(tracker.output.forward).toBe(0);

    tracker.handle('KeyW', false);
    tracker.handle('KeyW', true);
    expect(tracker.output.forward).toBe(1);
  });

  it('keeps fresh movement keys independent after cancellation', () => {
    const tracker = createKeyboardMovementTracker();

    tracker.handle('KeyW', true);
    tracker.clear();
    tracker.handle('KeyD', true);

    expect(tracker.output).toMatchObject({ forward: 0, right: 1 });
  });
});