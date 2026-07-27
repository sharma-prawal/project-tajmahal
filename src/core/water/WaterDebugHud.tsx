import type { ChangeEvent, CSSProperties } from 'react';
import { env } from '@config/env';
import { useWaterDebugStore } from './useWaterDebugStore';

const ROW: CSSProperties = { display: 'grid', gridTemplateColumns: '120px 1fr 48px', gap: 8, alignItems: 'center' };

export function WaterDebugHud() {
  if (!env.enableDebugTools) return null;
  return <WaterDebugHudInner />;
}

function WaterDebugHudInner() {
  const state = useWaterDebugStore();
  if (!state.active) return <div style={{ position: 'fixed', bottom: 30, right: 12, color: '#9fc8d0', font: '12px monospace' }}>Press U for water debug</div>;
  const range = (key: 'waveAmplitude' | 'waveSpeed' | 'reflectionIntensity' | 'specularIntensity' | 'rippleScale') =>
    (event: ChangeEvent<HTMLInputElement>) => state.set({ [key]: Number(event.target.value) });
  return <div style={{ position: 'fixed', left: 12, top: 12, width: 330, padding: 12, borderRadius: 6, background: 'rgba(4,18,24,.88)', color: '#d8ecec', font: '12px/1.6 monospace', zIndex: 20 }}>
    <strong>Water debug (dev only)</strong>
    <label style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>Reflection mode
      <select value={state.reflectionMode} onChange={(event) => state.set({ reflectionMode: event.target.value as typeof state.reflectionMode })}>
        <option value="auto">auto</option><option value="planar">planar</option><option value="environment">environment</option>
      </select>
    </label>
    <label style={ROW}>Wave amplitude<input type="range" min="0" max="0.1" step="0.005" value={state.waveAmplitude} onChange={range('waveAmplitude')} /><span>{state.waveAmplitude.toFixed(3)}</span></label>
    <label style={ROW}>Wave speed<input type="range" min="0" max="0.08" step="0.002" value={state.waveSpeed} onChange={range('waveSpeed')} /><span>{state.waveSpeed.toFixed(3)}</span></label>
    <label style={ROW}>Reflection<input type="range" min="0" max="1.5" step="0.05" value={state.reflectionIntensity} onChange={range('reflectionIntensity')} /><span>{state.reflectionIntensity.toFixed(2)}</span></label>
    <label style={ROW}>Specular<input type="range" min="0" max="1.5" step="0.05" value={state.specularIntensity} onChange={range('specularIntensity')} /><span>{state.specularIntensity.toFixed(2)}</span></label>
    <label style={ROW}>Ripple scale<input type="range" min="1" max="12" step="0.5" value={state.rippleScale} onChange={range('rippleScale')} /><span>{state.rippleScale.toFixed(1)}</span></label>
    <label style={{ display: 'flex', justifyContent: 'space-between' }}>Depth color<input type="color" value={state.depthColor} onChange={(event) => state.set({ depthColor: event.target.value })} /></label>
    <label style={{ display: 'flex', justifyContent: 'space-between' }}>Animation paused<input type="checkbox" checked={state.paused} onChange={(event) => state.set({ paused: event.target.checked })} /></label>
    <button type="button" onClick={state.reset}>Reset</button><span style={{ marginLeft: 10, opacity: 0.7 }}>[U] close</span>
  </div>;
}
