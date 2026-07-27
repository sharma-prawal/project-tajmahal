import { beforeEach, describe, expect, it } from 'vitest';
import { useLoadingStore } from './useLoadingStore';

const initialState = useLoadingStore.getState();

beforeEach(() => {
  useLoadingStore.setState(initialState, true);
});

describe('useLoadingStore boot phase', () => {
  it('starts in loading with nothing settled', () => {
    const state = useLoadingStore.getState();
    expect(state.phase).toBe('loading');
    expect(state.assetsSettled).toBe(false);
    expect(state.experienceMounted).toBe(false);
  });

  it('stays loading if only one boot task has completed', () => {
    useLoadingStore.getState().setAssetsSettled(true);
    expect(useLoadingStore.getState().phase).toBe('loading');

    useLoadingStore.setState(initialState, true);
    useLoadingStore.getState().setExperienceMounted();
    expect(useLoadingStore.getState().phase).toBe('loading');
  });

  it('becomes ready only once every boot task has completed', () => {
    useLoadingStore.getState().setAssetsSettled(true);
    useLoadingStore.getState().setExperienceMounted();
    expect(useLoadingStore.getState().phase).toBe('ready');
  });

  it('reports an error and does not flip back to ready', () => {
    useLoadingStore.getState().setError('boom');
    expect(useLoadingStore.getState().phase).toBe('error');
    expect(useLoadingStore.getState().error).toBe('boom');

    useLoadingStore.getState().setAssetsSettled(true);
    useLoadingStore.getState().setExperienceMounted();
    expect(useLoadingStore.getState().phase).toBe('error');
  });
});
