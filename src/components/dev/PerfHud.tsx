import { useEffect, useState } from 'react';
import { env } from '@config/env';
import { getPerfSample, DEFAULT_PERF_SAMPLE } from '@core/perf/perfSample';
import { checkBudget, mapQualityProfileToTierBudget } from '@core/perf/budgetCheck';

const POLL_INTERVAL_MS = 500;

/**
 * Dev-only performance HUD (Part 10) — DOM overlay outside the Canvas,
 * polling the `perfSample` module (written by `PerfSampler` inside the
 * Canvas) rather than subscribing every render frame. Not a player-facing
 * graphics menu — no settings, just numbers + budget warnings.
 */
export function PerfHud() {
  if (!env.enableDebugTools) return null;
  return <PerfHudInner />;
}

function PerfHudInner() {
  const [sample, setSample] = useState(getPerfSample());

  useEffect(() => {
    const id = setInterval(() => setSample(getPerfSample()), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (sample === DEFAULT_PERF_SAMPLE) return null;

  const budget = mapQualityProfileToTierBudget(sample.qualityProfile);
  const warnings = checkBudget(sample, budget);

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 30,
        background: 'rgba(10,10,10,0.75)',
        color: '#e8ddc9',
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.5,
        padding: '8px 10px',
        borderRadius: 4,
        pointerEvents: 'none',
        minWidth: 180,
      }}
    >
      <div>fps: {sample.fps.toFixed(0)} ({sample.frameTimeMs.toFixed(1)}ms) · 1% low: {sample.oneLowFps.toFixed(0)}</div>
      <div>draw calls: {sample.drawCalls}</div>
      <div>triangles: {sample.triangles.toLocaleString()}</div>
      <div>geometries: {sample.geometries} / textures: {sample.textures}</div>
      <div>programs: {sample.programs}</div>
      <div>shadow casters: {sample.shadowCasters}</div>
      <div>zone: {sample.worldZone}</div>
      <div>quality: {sample.qualityProfile} (budget: {budget.name})</div>
      <div>dpr: {sample.dpr.toFixed(2)} · shadow: {sample.shadowType} {sample.shadowMapSize}px</div>
      <div>exposure: {sample.exposure.toFixed(2)} · env: {sample.environmentMode}</div>
      <div>heap: {sample.jsHeapMB === null ? 'NOT MEASURED' : `${sample.jsHeapMB.toFixed(0)} MB`}</div>
      <div style={{ opacity: 0.7 }}>gpu: {sample.gpuRenderer ?? 'NOT MEASURED'}</div>
      {warnings.length > 0 && (
        <div style={{ marginTop: 4, color: '#ff9e6b' }}>
          {warnings.map((w) => (
            <div key={w.metric}>
              ⚠ {w.metric}: {w.value.toLocaleString()} &gt; {w.budget.toLocaleString()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
