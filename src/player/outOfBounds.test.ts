import { describe, expect, it } from 'vitest';
import { isInvalidPhysicsState, isOutOfBounds, type Bounds } from './outOfBounds';

const bounds: Bounds = { minX: -10, maxX: 10, minY: -5, maxY: 50, minZ: -20, maxZ: 5 };

describe('isOutOfBounds', () => {
  it('is false for a position well within bounds', () => {
    expect(isOutOfBounds({ x: 0, y: 1, z: -5 }, bounds)).toBe(false);
  });

  it('is true when below minY (fell through the world)', () => {
    expect(isOutOfBounds({ x: 0, y: -10, z: -5 }, bounds)).toBe(true);
  });

  it('is true when beyond maxX', () => {
    expect(isOutOfBounds({ x: 15, y: 1, z: -5 }, bounds)).toBe(true);
  });

  it('is true when beyond minZ (past the mausoleum end)', () => {
    expect(isOutOfBounds({ x: 0, y: 1, z: -25 }, bounds)).toBe(true);
  });

  it('is false exactly at a boundary (inclusive)', () => {
    expect(isOutOfBounds({ x: 10, y: 1, z: -5 }, bounds)).toBe(false);
  });
});

describe('isInvalidPhysicsState', () => {
  it('is false for finite positions', () => {
    expect(isInvalidPhysicsState({ x: 1, y: 2, z: 3 })).toBe(false);
  });

  it('is true for NaN', () => {
    expect(isInvalidPhysicsState({ x: NaN, y: 0, z: 0 })).toBe(true);
  });

  it('is true for Infinity', () => {
    expect(isInvalidPhysicsState({ x: 0, y: Infinity, z: 0 })).toBe(true);
  });
});
