export const CLEAR_EXPLORATION_INPUT_EVENT = 'project-taj:clear-exploration-input';
export function clearExplorationInput(): void { if (typeof window !== 'undefined') window.dispatchEvent(new Event(CLEAR_EXPLORATION_INPUT_EVENT)); }
