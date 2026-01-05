/**
 * Hook pour throttle une valeur
 * Limite la fréquence de mise à jour de la valeur
 * 
 * Conforme GUIDE-EXCELLENCE-CODE.md :
 * - Throttle scroll (100ms standard)
 * - Utilisé pour réduire les événements fréquents
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Throttle une valeur
 * @param value - Valeur à throttler
 * @param delay - Délai en millisecondes (défaut: 100ms)
 * @returns Valeur throttlée
 */
export function useThrottle<T>(value: T, delay: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= delay) {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }
    }, delay - (Date.now() - lastRun.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

