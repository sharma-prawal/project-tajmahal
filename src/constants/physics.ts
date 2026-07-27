export const GRAVITY: [number, number, number] = [0, -18, 0];

export const PLAYER_CAPSULE = {
  radius: 0.35,
  halfHeight: 0.55,
} as const;

/** Just inside the forecourt, with the capsule already seated on the terrain. */
export const PLAYER_SPAWN_POSITION: [number, number, number] = [0, 0.9, -3];
