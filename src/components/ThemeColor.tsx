'use client';

import { useEffect } from 'react';

/**
 * Composant client qui met à jour la meta tag theme-color
 * en fonction du thème actif en lisant la variable CSS --color-bg-primary
 */
export default function ThemeColor() {
  useEffect(() => {
    const updateThemeColor = () => {
      // Lire la variable CSS --color-bg-primary du document
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-bg-primary')
        .trim();
      
      // Update la meta tag avec la vraie couleur du thème
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor && bgColor) {
        metaThemeColor.setAttribute('content', bgColor);
      }
    };
    
    // Update initial après un court délai pour s'assurer que les CSS sont chargés
    setTimeout(updateThemeColor, 100);
    
    // Observer les changements de classe sur <html> (changement de thème)
    const observer = new MutationObserver(() => {
      setTimeout(updateThemeColor, 50);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);
  
  return null;
}

