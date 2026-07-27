export interface MovementInput {
  forward: number;
  right: number;
  running: boolean;
}

export interface LookDelta {
  dx: number;
  dy: number;
}

/** Which input actually produced the most recent event — can change mid-session. */
export type ActiveInput = 'pointer' | 'touch' | 'keyboard' | 'gamepad';

/** Which control scheme the UI/player controller should present — derived from ActiveInput. */
export type ControlScheme = 'desktop' | 'touch';
