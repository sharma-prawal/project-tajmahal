import type { CSSProperties } from 'react';
import { env } from '@config/env';
import { BAKEOFF_REVIEW_VIEWS } from './reviewViews';
import { TIER_RENDER_SETTINGS } from './reviewConfig';
import { useBakeoffReviewStore } from './useBakeoffReviewStore';

const ROW_STYLE: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16 };

/**
 * Dev-only DOM overlay (Phase 3B Part 1: "show the exact active
 * configuration", Part 9: manual review instructions) — plain HTML/CSS, no
 * canvas draw calls, and never mounted outside `env.enableDebugTools`. Shows
 * every review axis's current value plus the keybinding that changes it, so
 * a human reviewer never has to open source to know what they're looking
 * at.
 */
export function BakeoffReviewHud() {
  if (!env.enableDebugTools) return null;
  return <BakeoffReviewHudInner />;
}

function BakeoffReviewHudInner() {
  const active = useBakeoffReviewStore((s) => s.active);
  const viewIndex = useBakeoffReviewStore((s) => s.viewIndex);
  const background = useBakeoffReviewStore((s) => s.background);
  const fog = useBakeoffReviewStore((s) => s.fog);
  const shadows = useBakeoffReviewStore((s) => s.shadows);
  const tier = useBakeoffReviewStore((s) => s.tier);
  const lodOverride = useBakeoffReviewStore((s) => s.lodOverride);
  const material = useBakeoffReviewStore((s) => s.material);
  const roughness = useBakeoffReviewStore((s) => s.roughness);
  const facadeDepth = useBakeoffReviewStore((s) => s.facadeDepth);
  const domeProfile = useBakeoffReviewStore((s) => s.domeProfile);
  const minaretTaper = useBakeoffReviewStore((s) => s.minaretTaper);
  const lightMode = useBakeoffReviewStore((s) => s.lightMode);
  const diagnostic = useBakeoffReviewStore((s) => s.diagnostic);

  if (!active) {
    return (
      <div style={{ position: 'fixed', bottom: 12, left: 12, color: '#e8ddc9', fontFamily: 'monospace', fontSize: 12 }}>
        Press B for Taj bake-off review mode
      </div>
    );
  }

  const view = BAKEOFF_REVIEW_VIEWS[viewIndex];

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
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
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Taj bake-off review mode (dev only)</div>
      <div style={ROW_STYLE}>
        <span>[N] view</span>
        <span>{view.label}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[1] background</span>
        <span>{background}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[2] fog</span>
        <span>{fog ? 'on' : 'off'}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[3] shadows</span>
        <span>{shadows ? 'on' : 'off'}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[4] tier</span>
        <span>{TIER_RENDER_SETTINGS[tier].label}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[5] LOD</span>
        <span>{lodOverride}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[6] material</span>
        <span>{material}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[7] roughness</span>
        <span>{roughness}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[8] façade depth</span>
        <span>{facadeDepth}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[9] dome profile</span>
        <span>{domeProfile}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[0] minaret taper</span>
        <span>{minaretTaper}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[L] light</span>
        <span>{lightMode}</span>
      </div>
      <div style={ROW_STYLE}>
        <span>[K] diagnostic</span>
        <span>{diagnostic}</span>
      </div>
      <div style={{ marginTop: 6, opacity: 0.7 }}>[R] reset · [B] exit review mode</div>
    </div>
  );
}
