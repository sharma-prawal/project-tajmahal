import { describe, expect, it } from 'vitest';
import { sampleGamepadAxes } from './gamepad';

describe('gamepad exploration adapter', () => {
  it('removes drift inside the dead zone and maps both sticks', () => { expect(sampleGamepadAxes([.1, -.1, .05, -.05]).active).toBe(false); const sample = sampleGamepadAxes([.5, -1, -.5, .4]); expect(sample.movement.forward).toBeGreaterThan(0); expect(sample.movement.right).toBeGreaterThan(0); expect(sample.lookX).toBeLessThan(0); expect(sample.lookY).toBeGreaterThan(0); });
  it('normalizes diagonal left-stick magnitude', () => { const sample = sampleGamepadAxes([1, -1, 0, 0]); expect(Math.hypot(sample.movement.right, sample.movement.forward)).toBeCloseTo(1); });
});
