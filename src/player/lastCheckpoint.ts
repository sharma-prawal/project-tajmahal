import { PLAYER_SPAWN_POSITION } from '@constants/physics';

export interface Checkpoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Module-level mutable "last known good" player position — written every
 * few fixed physics steps whenever grounded (see PlayerController), read by
 * both out-of-bounds recovery (teleport back) and the save system
 * (persisted checkpoint, Part 7). A plain module singleton rather than a
 * Zustand store: it's write-heavy (every N physics steps) and read-rarely,
 * so it deliberately never triggers a React re-render.
 */
let checkpoint: Checkpoint = {
  x: PLAYER_SPAWN_POSITION[0],
  y: PLAYER_SPAWN_POSITION[1],
  z: PLAYER_SPAWN_POSITION[2],
};

export function getLastCheckpoint(): Checkpoint {
  return checkpoint;
}

export function setLastCheckpoint(next: Checkpoint): void {
  checkpoint = next;
}

/** Restores the checkpoint from a loaded save (Part 7) — validated by the caller before this is invoked. */
export function hydrateLastCheckpoint(next: Checkpoint): void {
  checkpoint = next;
}
