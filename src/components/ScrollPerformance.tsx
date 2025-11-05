'use client';

import { useEffect, useRef } from 'react';

/**
 * Composant d'optimisation performance scroll
 * - Ajoute classe .scrolling pendant scroll (désactive transitions CSS)
 * - Throttle agressif pour éviter trop de DOM mutations
 * - Passive listeners pour performance
 * - RequestAnimationFrame pour synchronisation avec le browser
 */
export default function ScrollPerformance() {
  const isScrollingRef = useRef(false);
  
  useEffect(() => {
    // TODO: Réactiver diagnostics après fix du bug prod
    // if (process.env.NODE_ENV === 'development') {
    //   enableScrollDiagnostics();
    //   enablePerformanceDiagnostics();
    // }
    
    let scrollTimeout: NodeJS.Timeout | null = null;
    let rafId: number | null = null;

    const handleScrollStart = () => {
      // Cancel RAF précédent si existe
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // Utiliser RAF pour synchroniser avec le browser paint cycle
      rafId = requestAnimationFrame(() => {
        if (!isScrollingRef.current) {
          isScrollingRef.current = true;
          document.body.classList.add('scrolling');
        }

        // Clear le timeout précédent
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        // Attendre 200ms après la fin du scroll (plus long = moins de toggles)
        scrollTimeout = setTimeout(() => {
          rafId = requestAnimationFrame(() => {
            isScrollingRef.current = false;
            document.body.classList.remove('scrolling');
          });
        }, 200);
      });
    };

    // Passive listener pour performance
    window.addEventListener('scroll', handleScrollStart, { passive: true } as any);

    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', handleScrollStart);
      document.body.classList.remove('scrolling');
    };
  }, []);

  return null;
}

