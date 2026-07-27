export interface LocomotionStartGate {
  beforePhysics: (hasInput: boolean) => boolean;
  afterRender: () => void;
}

/** Holds a fresh movement request until presentation has rendered its walk pose. */
export function createLocomotionStartGate(): LocomotionStartGate {
  let inputActive = false;
  let animationRendered = false;

  return {
    beforePhysics(hasInput) {
      if (!hasInput) {
        inputActive = false;
        animationRendered = false;
        return false;
      }
      if (!inputActive) {
        inputActive = true;
        animationRendered = false;
      }
      return !animationRendered;
    },
    afterRender() {
      if (inputActive) animationRendered = true;
    },
  };
}