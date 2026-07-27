const listeners = new Set<() => void>();

export function requestFinalLetterReopen(): void {
  for (const listener of listeners) listener();
}

export function subscribeFinalLetterReopen(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}