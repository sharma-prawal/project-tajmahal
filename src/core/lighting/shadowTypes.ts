import { BasicShadowMap, PCFShadowMap, PCFSoftShadowMap, VSMShadowMap, type ShadowMapType } from 'three';

export type ShadowTypeName = 'basic' | 'pcf' | 'pcfsoft' | 'vsm';

/** Named shadow-map algorithms for the Phase 4C benchmark matrix — maps to three's actual renderer constants. */
export const SHADOW_TYPE_MAP: Record<ShadowTypeName, ShadowMapType> = {
  basic: BasicShadowMap,
  pcf: PCFShadowMap,
  pcfsoft: PCFSoftShadowMap,
  vsm: VSMShadowMap,
};

export const SHADOW_TYPE_ORDER: ShadowTypeName[] = ['basic', 'pcf', 'pcfsoft', 'vsm'];

/** The Phase 4B production default — `CanvasRoot` falls back to this when no benchmark override is active. */
export const DEFAULT_SHADOW_TYPE: ShadowTypeName = 'pcfsoft';
