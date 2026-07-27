export type HeroineLocomotionState = 'idle' | 'walk' | 'jog' | 'run' | 'interact';

export interface HeroineMotionSnapshot {
  speed: number;
  running: boolean;
  grounded: boolean;
  interacting: boolean;
}

export const HEROINE_ANIMATION_CLIPS: Record<HeroineLocomotionState, string> = {
  idle: 'Idle_Loop',
  walk: 'Walk_Formal_Loop',
  jog: 'Jog_Fwd_Loop',
  run: 'Sprint_Loop',
  interact: 'Interact',
};

export function selectHeroineLocomotion(snapshot: HeroineMotionSnapshot): HeroineLocomotionState {
  if (snapshot.interacting && snapshot.speed < 0.15) return 'interact';
  if (snapshot.speed < 0.12) return 'idle';
  if (snapshot.running && snapshot.speed >= 3.2) return 'run';
  if (snapshot.speed >= 2.15) return 'jog';
  return 'walk';
}

export function heroineAnimationTimeScale(state: HeroineLocomotionState, speed: number): number {
  if (state === 'walk') return Math.min(1.22, Math.max(0.72, speed / 1.72));
  if (state === 'jog') return Math.min(1.18, Math.max(0.86, speed / 2.65));
  if (state === 'run') return Math.min(1.12, Math.max(0.9, speed / 4.3));
  return 1;
}

export function shouldShowHeroine(cameraOwned: boolean, reviewCameraActive: boolean, cameraPerspective: 'third-person' | 'first-person' = 'third-person'): boolean {
  return !cameraOwned && !reviewCameraActive && cameraPerspective !== 'first-person';
}
