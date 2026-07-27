import { useLoadingStore } from '@state/useLoadingStore';

/**
 * Minimal scaffold, not the final art-directed loading screen. Exists so
 * the loading *system* (store, bridge, transition, failure state) is
 * provable end-to-end before design assets land.
 */
export function LoadingScreen() {
  const phase = useLoadingStore((state) => state.phase);
  const progress = useLoadingStore((state) => state.progress);
  const error = useLoadingStore((state) => state.error);

  if (phase === 'ready') return null;
  return <div className="loading-screen" role="status" aria-live="polite">
        <div className="loading-screen__mark" aria-hidden="true"><i /><i /><i /></div>
        <div className="loading-screen__eyebrow">Project Taj</div>
        <h1>{phase === 'error' ? 'The garden could not open' : 'Entering the garden'}</h1>
          {phase === 'error' ? (
            <>
              {error && <p>{error}</p>}<button className="button-primary" onClick={() => window.location.reload()}>Try again</button>
            </>
          ) : (
            <><div className="loading-screen__track"><i style={{ width: `${progress}%` }} /></div><span>{Math.round(progress)}%</span></>
          )}
        </div>;
}
