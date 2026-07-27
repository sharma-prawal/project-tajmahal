import { describe, expect, it } from 'vitest';
import { heroineAnimationTimeScale, selectHeroineLocomotion, shouldShowHeroine } from './heroineAnimation';

describe('heroine locomotion presentation', () => {
  it('selects stable idle, walk, jog and run bands', () => {
    expect(selectHeroineLocomotion({ speed: 0.05, running: false, grounded: true, interacting: false })).toBe('idle');
    expect(selectHeroineLocomotion({ speed: 1.5, running: false, grounded: true, interacting: false })).toBe('walk');
    expect(selectHeroineLocomotion({ speed: 2.4, running: false, grounded: true, interacting: false })).toBe('jog');
    expect(selectHeroineLocomotion({ speed: 4.1, running: true, grounded: true, interacting: false })).toBe('run');
    expect(selectHeroineLocomotion({ speed: 1.5, running: false, grounded: false, interacting: false })).toBe('walk');
  });

  it('gives a stationary interaction priority and bounds stride correction', () => {
    expect(selectHeroineLocomotion({ speed: 0, running: false, grounded: true, interacting: true })).toBe('interact');
    expect(heroineAnimationTimeScale('walk', 0)).toBe(0.72);
    expect(heroineAnimationTimeScale('run', 9)).toBe(1.12);
  });

  it('hides the avatar while authored and review cameras own framing or in first-person mode', () => {
    expect(shouldShowHeroine(false, false)).toBe(true);
    expect(shouldShowHeroine(true, false)).toBe(false);
    expect(shouldShowHeroine(false, true)).toBe(false);
    expect(shouldShowHeroine(false, false, 'first-person')).toBe(false);
  });
});
