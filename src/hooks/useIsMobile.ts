import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Retourne true si la fenêtre est en dessous du breakpoint mobile.
 * SSR-safe : commence à false, se met à jour côté client.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}
