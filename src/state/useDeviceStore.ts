import { create } from 'zustand';
import { getDeviceCapabilities, type DeviceCapabilities } from '@utils/device';
import type { ActiveInput, ControlScheme } from '@/types/input';

interface DeviceState {
  capabilities: DeviceCapabilities;
  /** Last input method that actually produced an event — updates live, see useActiveInputTracking. */
  activeInput: ActiveInput;
  /** Which control scheme to present, derived from activeInput. */
  controlScheme: ControlScheme;
  setActiveInput: (input: ActiveInput) => void;
}

const initialCapabilities = getDeviceCapabilities();

export const useDeviceStore = create<DeviceState>((set) => ({
  capabilities: initialCapabilities,
  activeInput: initialCapabilities.hasTouch && !initialCapabilities.hasFinePointer ? 'touch' : 'pointer',
  controlScheme: initialCapabilities.hasTouch && !initialCapabilities.hasFinePointer ? 'touch' : 'desktop',
  setActiveInput: (activeInput) =>
    set({ activeInput, controlScheme: activeInput === 'touch' ? 'touch' : 'desktop' }),
}));
