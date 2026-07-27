import type { ChangeEvent, CSSProperties } from 'react';
import { env } from '@config/env';
import { AMBIENT_LIFE } from '@constants/ambientLife';
import { useAmbientLifeQuality } from './useAmbientLifeQuality';
import { useAmbientLifeDebugStore } from './useAmbientLifeDebugStore';
import { useAccessibilityStore } from '@state/useAccessibilityStore';

const ROW: CSSProperties = { display: 'grid', gridTemplateColumns: '104px 1fr 42px', gap: 8, alignItems: 'center' };

export function AmbientLifeDebugHud() {
  if (!env.enableDebugTools) return null;
  return <AmbientLifeDebugHudInner />;
}

function AmbientLifeDebugHudInner() {
  const state = useAmbientLifeDebugStore();
  const quality = useAmbientLifeQuality();
  const reducedMotion = useAccessibilityStore((state) => state.reducedMotion);
  if (!state.active) return <div style={{ position: 'fixed', bottom: 66, right: 12, color: '#d9c79d', font: '12px monospace' }}>Press O for ambient life debug</div>;
  const range = (key: 'density' | 'speed' | 'opacity') => (event: ChangeEvent<HTMLInputElement>) => state.set({ [key]: Number(event.target.value) });
  const toggle = (key: 'birds' | 'butterflies' | 'petals' | 'leaves' | 'mist' | 'paused' | 'diagnostic') => (event: ChangeEvent<HTMLInputElement>) => state.set({ [key]: event.target.checked });
  const active = (count: number, familyEnabled: number) => reducedMotion ? 0 : Math.floor(count * Math.min(1, quality.density * state.density) * familyEnabled);
  return <div style={{ position: 'fixed', left: 12, top: 270, width: 308, padding: 12, borderRadius: 6, background: 'rgba(16,20,17,.9)', color: '#e8dfc6', font: '12px/1.55 monospace', zIndex: 22 }}>
    <strong>Ambient life debug (dev only)</strong>
    <div style={{ opacity: 0.72 }}>tier {quality.name} · one particle + six instanced wildlife draws</div>
    <div style={{ color: reducedMotion ? '#f2cf83' : '#a9d6ad' }}>reduced motion: {reducedMotion ? 'ambient field suspended' : 'off'}</div>
    <label style={ROW}>Spawn density<input aria-label="Ambient spawn density" type="range" min="0" max="1" step="0.05" value={state.density} onChange={range('density')} /><span>{state.density.toFixed(2)}</span></label>
    <label style={ROW}>Speed<input aria-label="Ambient animation speed" type="range" min="0" max="2" step="0.05" value={state.speed} onChange={range('speed')} /><span>{state.speed.toFixed(2)}</span></label>
    <label style={ROW}>Opacity<input aria-label="Ambient opacity" type="range" min="0" max="1" step="0.05" value={state.opacity} onChange={range('opacity')} /><span>{state.opacity.toFixed(2)}</span></label>
    <label>Birds ({active(AMBIENT_LIFE.counts.birds, quality.birds)})<input type="checkbox" checked={state.birds} onChange={toggle('birds')} /></label><br />
    <label>Butterflies ({active(AMBIENT_LIFE.counts.butterflies, quality.butterflies)})<input type="checkbox" checked={state.butterflies} onChange={toggle('butterflies')} /></label><br />
    <label>Petals ({active(AMBIENT_LIFE.counts.petals, quality.petals)})<input type="checkbox" checked={state.petals} onChange={toggle('petals')} /></label><br />
    <label>Leaves ({active(AMBIENT_LIFE.counts.leaves, quality.leaves)})<input type="checkbox" checked={state.leaves} onChange={toggle('leaves')} /></label><br />
    <label>Mist ({active(AMBIENT_LIFE.counts.mist, quality.mist)})<input type="checkbox" checked={state.mist} onChange={toggle('mist')} /></label><br />
    <label>Pause animation<input type="checkbox" checked={state.paused} onChange={toggle('paused')} /></label><br />
    <label>Debug visualization<input type="checkbox" checked={state.diagnostic} onChange={toggle('diagnostic')} /></label><br />
    <button type="button" onClick={state.reset}>Reset</button><span style={{ marginLeft: 10, opacity: 0.7 }}>[O] close</span>
  </div>;
}
