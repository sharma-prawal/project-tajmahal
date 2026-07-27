import type { ChangeEvent, CSSProperties } from 'react';
import { env } from '@config/env';
import { useTraversalDebugStore } from './useTraversalDebugStore';

const ROW: CSSProperties = { display: 'grid', gridTemplateColumns: '112px 1fr 46px', gap: 7, alignItems: 'center' };
type RangeKey = 'walkSpeed' | 'acceleration' | 'deceleration' | 'rotationSmoothing' | 'cameraDistance' | 'cameraHeight' | 'cameraDamping' | 'fov' | 'sensitivity';

export function TraversalDebugHud() {
  if (!env.enableDebugTools) return null;
  return <TraversalDebugHudInner />;
}

function TraversalDebugHudInner() {
  const state = useTraversalDebugStore();
  if (!state.active) return <div style={{ position: 'fixed', bottom: 84, right: 12, color: '#d9c79d', font: '12px monospace' }}>Press L for traversal debug</div>;
  const range = (key: RangeKey) => (event: ChangeEvent<HTMLInputElement>) => state.set({ [key]: Number(event.target.value) });
  const slider = (label: string, key: RangeKey, min: number, max: number, step: number, digits = 2) => <label style={ROW}>{label}<input aria-label={label} type="range" min={min} max={max} step={step} value={state[key]} onChange={range(key)} /><span>{state[key].toFixed(digits)}</span></label>;
  return <div style={{ position: 'fixed', right: 12, top: 12, width: 330, padding: 12, borderRadius: 6, background: 'rgba(15,18,20,.92)', color: '#eee4cd', font: '12px/1.5 monospace', zIndex: 24 }}>
    <strong>Traversal debug (dev only)</strong>
    <div style={{ opacity: 0.72 }}>fixed 60 Hz motor · no sprint · camera ray</div>
    {slider('Walk speed', 'walkSpeed', 1, 4, 0.05)}
    {slider('Acceleration', 'acceleration', 2, 20, 0.5, 1)}
    {slider('Deceleration', 'deceleration', 2, 24, 0.5, 1)}
    {slider('Facing damping', 'rotationSmoothing', 2, 18, 0.5, 1)}
    {slider('Camera distance', 'cameraDistance', 3, 10, 0.1, 1)}
    {slider('Camera height', 'cameraHeight', 1.5, 5, 0.05)}
    {slider('Camera damping', 'cameraDamping', 2, 14, 0.5, 1)}
    {slider('FOV', 'fov', 40, 70, 1, 0)}
    {slider('Look sensitivity', 'sensitivity', 0.0008, 0.006, 0.0001, 4)}
    <label>Invert Y<input type="checkbox" checked={state.invertY} onChange={(event) => state.set({ invertY: event.target.checked })} /></label><br />
    <label>Collision debug<input type="checkbox" checked={state.collisionDebug} onChange={(event) => state.set({ collisionDebug: event.target.checked })} /></label><br />
    <label>Path visualization<input type="checkbox" checked={state.pathVisualization} onChange={(event) => state.set({ pathVisualization: event.target.checked })} /></label><br />
    <label>Reduced motion simulation<input type="checkbox" checked={state.reducedMotionSimulation} onChange={(event) => state.set({ reducedMotionSimulation: event.target.checked })} /></label><br />
    <button type="button" onClick={state.reset}>Reset</button><span style={{ marginLeft: 10, opacity: 0.7 }}>[L] close</span>
  </div>;
}
