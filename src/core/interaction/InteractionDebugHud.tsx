import type { CSSProperties } from 'react';
import { env } from '@config/env';
import { useAccessibilityStore } from '@state/useAccessibilityStore';
import { interactionRuntime } from './InteractionRuntime';
import { useInteractionDebugStore } from './useInteractionDebugStore';
import { useInteractionSnapshot } from './useInteractionSnapshot';

const PANEL: CSSProperties = { position: 'fixed', left: 12, top: 12, width: 365, maxHeight: 'calc(100vh - 24px)', overflow: 'auto', padding: 12, borderRadius: 6, background: 'rgba(12,17,19,.94)', color: '#eee4cd', font: '12px/1.45 monospace', zIndex: 26 };

export function InteractionDebugHud() {
  if (!env.enableDebugTools) return null;
  return <InteractionDebugHudInner />;
}

function InteractionDebugHudInner() {
  const debug = useInteractionDebugStore();
  const snapshot = useInteractionSnapshot();
  const distanceScale = useAccessibilityStore((state) => state.interactionDistanceScale);
  const highContrast = useAccessibilityStore((state) => state.highContrastPrompts);
  if (!debug.active) return <div style={{ position: 'fixed', left: 12, bottom: 84, color: '#d9c79d', font: '12px monospace', zIndex: 20 }}>Press J for interaction debug</div>;
  const diagnostics = interactionRuntime.getDiagnostics();
  const events = interactionRuntime.getEvents();
  return <div style={PANEL}>
    <strong>Interaction debug (dev only)</strong>
    <div>registered: {interactionRuntime.registry.size} · selected: {snapshot.focusedId ?? 'none'} · state: {snapshot.lifecycle}</div>
    <div>duplicate IDs: none · occlusion: not evaluated (authored ranges)</div>
    <label><input type="checkbox" checked={debug.showBounds} onChange={(event) => debug.set({ showBounds: event.target.checked })} /> Trigger bounds + activation range</label><br />
    <label><input type="checkbox" checked={debug.showFocusCones} onChange={(event) => debug.set({ showFocusCones: event.target.checked })} /> Focus-angle guides</label><br />
    <label>Interaction distance <input aria-label="Interaction distance" type="range" min="1" max="1.5" step="0.1" value={distanceScale} onChange={(event) => useAccessibilityStore.getState().setInteractionDistanceScale(Number(event.target.value))} /> {distanceScale.toFixed(1)}×</label><br />
    <label><input aria-label="High-contrast prompts" type="checkbox" checked={highContrast} onChange={(event) => useAccessibilityStore.getState().setHighContrastPrompts(event.target.checked)} /> High-contrast prompts</label>
    <hr style={{ borderColor: '#544c3b' }} />
    {interactionRuntime.registry.list().map((definition) => {
      const diagnostic = diagnostics.find((item) => item.id === definition.id);
      return <div key={definition.id} style={{ color: snapshot.focusedId === definition.id ? '#ffe492' : '#cfc5ae', marginBottom: 5 }}>
        {definition.id} p{definition.priority ?? 0} · {definition.behavior}<br />
        <span style={{ opacity: 0.72 }}>{diagnostic ? `${diagnostic.distance.toFixed(2)}m · align ${diagnostic.alignment.toFixed(2)} · range ${diagnostic.rangeEligible ? 'yes' : 'no'} · angle ${diagnostic.angleEligible ? 'yes' : 'no'}` : 'awaiting sample'} · persisted {interactionRuntime.getCompletedIds().includes(definition.id) ? 'yes' : 'no'}</span>
      </div>;
    })}
    <hr style={{ borderColor: '#544c3b' }} />
    <strong>Lifecycle events</strong>
    {events.slice(-7).reverse().map((event, index) => <div key={`${event.at}-${index}`} style={{ opacity: 0.78 }}>{event.id ?? 'none'}: {event.from} → {event.to} ({event.reason})</div>)}
    <div style={{ opacity: 0.65, marginTop: 6 }}>[J] close · fixtures are validation-only</div>
  </div>;
}
