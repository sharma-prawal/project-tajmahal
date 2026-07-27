import { describe, expect, it } from 'vitest';
import { parseDevSpawn } from './devSpawn';

describe('parseDevSpawn', () => {
  it('accepts a finite in-bounds triple', () => expect(parseDevSpawn('2,3,-55')).toEqual({ x: 2, y: 3, z: -55 }));
  it('rejects malformed and non-finite triples', () => {
    expect(parseDevSpawn('1,2')).toBeNull();
    expect(parseDevSpawn('1,NaN,-3')).toBeNull();
  });
  it('rejects positions outside world recovery bounds', () => expect(parseDevSpawn('999,2,-3')).toBeNull());
});
