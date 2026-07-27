import type { ChangeEvent, CSSProperties } from 'react';
import { env } from '@config/env';
import { useAtmosphereDebugStore } from './useAtmosphereDebugStore';

const ROW: CSSProperties = { display: 'grid', gridTemplateColumns: '112px 1fr 44px', gap: 8, alignItems: 'center' };

export function AtmosphereDebugHud() {
  if (!env.enableDebugTools) return null;
  return <AtmosphereDebugHudInner />;
}

function AtmosphereDebugHudInner() {
  const state = useAtmosphereDebugStore();
  if (!state.active) return <div style={{ position: 'fixed', bottom: 48, right: 12, color: '#e7d5ad', font: '12px monospace' }}>Press I for atmosphere debug</div>;
  const range = (key: 'hazeScale' | 'windAmplitude' | 'windSpeed' | 'particleOpacity') =>
    (event: ChangeEvent<HTMLInputElement>) => state.set({ [key]: Number(event.target.value) });
  return <div style={{ position: 'fixed', left: 12, top: 12, width: 320, padding: 12, borderRadius: 6, background: 'rgba(21,17,12,.88)', color: '#f1e5ca', font: '12px/1.6 monospace', zIndex: 21 }}>
    <strong>Atmosphere debug (dev only)</strong>
    <label style={ROW}>Haze scale<input type="range" min="0" max="2" step="0.05" value={state.hazeScale} onChange={range('hazeScale')} /><span>{state.hazeScale.toFixed(2)}</span></label>
    <label style={ROW}>Wind amplitude<input type="range" min="0" max="0.15" step="0.005" value={state.windAmplitude} onChange={range('windAmplitude')} /><span>{state.windAmplitude.toFixed(3)}</span></label>
    <label style={ROW}>Wind speed<input type="range" min="0" max="1.5" step="0.05" value={state.windSpeed} onChange={range('windSpeed')} /><span>{state.windSpeed.toFixed(2)}</span></label>
    <label style={ROW}>Particle opacity<input type="range" min="0" max="0.8" step="0.02" value={state.particleOpacity} onChange={range('particleOpacity')} /><span>{state.particleOpacity.toFixed(2)}</span></label>
    <label style={{ display: 'flex', justifyContent: 'space-between' }}>Wind<input type="checkbox" checked={state.windEnabled} onChange={(event) => state.set({ windEnabled: event.target.checked })} /></label>
    <label style={{ display: 'flex', justifyContent: 'space-between' }}>Particles<input type="checkbox" checked={state.particlesEnabled} onChange={(event) => state.set({ particlesEnabled: event.target.checked })} /></label>
    <label style={{ display: 'flex', justifyContent: 'space-between' }}>Pause animation<input type="checkbox" checked={state.paused} onChange={(event) => state.set({ paused: event.target.checked })} /></label>
    <label style={{ display: 'flex', justifyContent: 'space-between' }}>Diagnostic visibility<input type="checkbox" checked={state.diagnostic} onChange={(event) => state.set({ diagnostic: event.target.checked })} /></label>
    <button type="button" onClick={state.reset}>Reset</button><span style={{ marginLeft: 10, opacity: 0.7 }}>[I] close</span>
  </div>;
}
