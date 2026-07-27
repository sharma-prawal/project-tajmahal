import { Component, type ReactNode } from 'react';
import { useLoadingStore } from '@state/useLoadingStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time failures from the lazy-loaded 3D experience chunk
 * (WebGL context creation, chunk-fetch failure, Rapier init) and reports
 * them into the loading store so `LoadingScreen` can show a recoverable
 * failure state instead of leaving the player on a permanent blank canvas.
 *
 * Class component because React error boundaries have no hook equivalent.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    useLoadingStore.getState().setError(message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
