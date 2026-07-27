import { describe, expect, it } from 'vitest';
import { getLastCheckpoint, hydrateLastCheckpoint } from './lastCheckpoint';

describe('checkpoint restoration', () => {
  it('hydrates a validated checkpoint exactly', () => {
    hydrateLastCheckpoint({ x: 4, y: 2.5, z: -18 });
    expect(getLastCheckpoint()).toEqual({ x: 4, y: 2.5, z: -18 });
  });
});
