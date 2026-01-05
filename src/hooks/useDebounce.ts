/**
 * Hook pour debounce une valeur
 * Retarde la mise à jour de la valeur jusqu'à ce qu'il n'y ait plus de changements pendant le délai
 * 
 * Conforme GUIDE-EXCELLENCE-CODE.md :
 * - Debounce inputs (300ms standard)
 * - Utilisé pour réduire les appels API
 */

import { useState, useEffect } from 'react';

/**
 * Debounce une valeur
 * @param value - Valeur à debouncer
 * @param delay - Délai en millisecondes (défaut: 300ms)
 * @returns Valeur debouncée
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

