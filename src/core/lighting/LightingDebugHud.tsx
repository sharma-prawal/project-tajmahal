import type { CSSProperties } from 'react';
import { env } from '@config/env';
import { LIGHTING, SKY, FOG, HEMISPHERE_LIGHT, ENVIRONMENT_MAP } from '@constants/scene';
import { LIGHTING_CAPTURE_VIEWS } from './lightingCaptureViews';
import { useLightingDebugStore } from './useLightingDebugStore';
import { useSunsetStore } from '@narrative/useSunsetStore';

const ROW_STYLE: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16 };

/**
 * Dev-only DOM overlay for the Phase 4B lighting debug tool — light
 * direction, exposure, fog density, ambient (hemisphere) intensity, sky
 * parameters, and environment-map ("reflection") intensity, plus the
 * keybinding that changes each. Plain HTML/CSS, no canvas draw calls, never
 * mounted outside `env.enableDebugTools`.
 */
export function LightingDebugHud() {
  if (!env.enableDebugTools) return null;
  return <LightingDebugHudInner />;
}

function LightingDebugHudInner() {
  const active = useLightingDebugStore((s) => s.active);
  const viewIndex = useLightingDebugStore((s) => s.viewIndex);
  const fogEnabled = useLightingDebugStore((s) => s.fogEnabled);
  const preset = useLightingDebugStore((s) => s.preset);
  const exposureOverride = useLightingDebugStore((s) => s.exposureOverride);
  const shadowDiagnostic = useLightingDebugStore((s) => s.shadowDiagnostic);
  const benchmarkTier = useLightingDebugStore((s) => s.benchmarkTier);
  const dprOverride = useLightingDebugStore((s) => s.dprOverride);
  const shadowMapSizeOverride = useLightingDebugStore((s) => s.shadowMapSizeOverride);
  const shadowTypeOverride = useLightingDebugStore((s) => s.shadowTypeOverride);
  const sunT = useSunsetStore((s) => s.sunT);

  if (!active) {
    return (
      <div style={{ position: 'fixed', bottom: 12, right: 12, color: '#e8ddc9', fontFamily: 'monospace', fontSize: 12 }}>
        Press V for lighting debug mode
      </div>
    );
  }

  const view = LIGHTING_CAPTURE_VIEWS[viewIndex];

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        width: 300,
        background: 'rgba(0,0,0,0.8)',
        color: '#e8ddc9',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: 12,
        borderRadius: 6,
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Lighting debug (dev only)</div>
      <div style={ROW_STYLE}>
        <span>[M] view</span>
        <span>{view.label}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>sunT (live)</span>
        <span>{sunT.toFixed(3)}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[P] preset</span>
        <span>{preset}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[E] exposure</span>
        <span>{exposureOverride === null ? 'auto (sunT)' : exposureOverride.toFixed(2)}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[F] fog</span>
        <span>{fogEnabled ? `on (density ${FOG.density})` : 'off'}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[X] shadow diagnostic</span>
        <span>{shadowDiagnostic ? 'on' : 'off'}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>ambient (hemisphere)</span>
        <span>{HEMISPHERE_LIGHT.intensity}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>sun direction</span>
        <span>{LIGHTING.sunPosition.join(', ')}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>sky elevation/azimuth</span>
        <span>{SKY.elevation}° / {SKY.azimuth}°</span>
      </div>
      <div style={ROW_STYLE}>
        <span>env map intensity</span>
        <span>{ENVIRONMENT_MAP.intensity}</span>
      </div>
      <div style={{ fontWeight: 'bold', marginTop: 6, marginBottom: 2 }}>Benchmark (Phase 4C)</div>
      <div style={ROW_STYLE}>
        <span>[T] tier</span>
        <span>{benchmarkTier}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[D] dpr</span>
        <span>{dprOverride === null ? 'auto' : dprOverride}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[S] shadow map size</span>
        <span>{shadowMapSizeOverride === null ? 'auto' : `${shadowMapSizeOverride}px`}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[Y] shadow type</span>
        <span>{shadowTypeOverride ?? 'pcfsoft (default)'}</span>
      </div>
      <div style={{ marginTop: 6, opacity: 0.7 }}>[R] reset · [V] exit lighting debug</div>
    </div>
  );
}
