import { useEffect, useState } from 'react';

/** Tracks the `(orientation: portrait)` media query live, updating on resize/orientation change. */
export function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(orientation: portrait)').matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(orientation: portrait)');
    const onChange = () => setIsPortrait(mql.matches);
    mql.addEventListener('change', onChange);
    window.addEventListener('resize', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  return isPortrait;
}
