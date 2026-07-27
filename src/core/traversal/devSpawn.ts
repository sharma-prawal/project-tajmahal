import { OOB_BOUNDS } from '@constants/world';

export interface DevSpawn { x: number; y: number; z: number }

/** Debug/capture-only spawn parser. Invalid, non-finite, or out-of-world values are rejected. */
export function parseDevSpawn(value: string | null): DevSpawn | null {
  if (!value) return null;
  const parts = value.split(',').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [x, y, z] = parts;
  if (x < OOB_BOUNDS.minX || x > OOB_BOUNDS.maxX || y < OOB_BOUNDS.minY || y > OOB_BOUNDS.maxY || z < OOB_BOUNDS.minZ || z > OOB_BOUNDS.maxZ) return null;
  return { x, y, z };
}
