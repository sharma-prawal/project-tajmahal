import { createContext, useContext, useRef, type ReactNode, type MutableRefObject } from 'react';
import type { Object3D } from 'three';

type PlayerTargetRef = MutableRefObject<Object3D | null>;

const PlayerTargetContext = createContext<PlayerTargetRef | null>(null);

/**
 * Shares the player's Object3D across the scene without prop-drilling or
 * triggering React rerenders on every physics tick — cameras read the ref
 * directly inside useFrame.
 */
export function PlayerTargetProvider({ children }: { children: ReactNode }) {
  const ref = useRef<Object3D | null>(null);
  return <PlayerTargetContext.Provider value={ref}>{children}</PlayerTargetContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayerTarget(): PlayerTargetRef {
  const ctx = useContext(PlayerTargetContext);
  if (!ctx) throw new Error('usePlayerTarget must be used within PlayerTargetProvider');
  return ctx;
}
