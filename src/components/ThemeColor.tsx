'use client';

import { useEffect } from 'react';

/**
 * Composant client qui met à jour la meta tag theme-color
 * en fonction du thème actif en lisant la variable CSS --color-bg-primary
 * Contrôle total indépendamment du mode système Android/iOS
 */
export default function ThemeColor() {
  useEffect(() => {
    const updateThemeColor = () => {
      // Lire la variable CSS --color-bg-primary du document
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-bg-primary')
        .trim();
      
      if (!bgColor) return;
      
      // Update toutes les meta tags theme-color (au cas où il y en aurait plusieurs)
      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      metaTags.forEach(tag => {
        tag.setAttribute('content', bgColor);
      });
      
      // Forcer aussi dans le manifest si disponible
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'THEME_COLOR',
          color: bgColor
        });
      }
    };
    
    // Update initial après délai
    setTimeout(updateThemeColor, 100);
    
    // Update périodique pour forcer la couleur (Android peut reset)
    const interval = setInterval(updateThemeColor, 2000);
    
    // Observer les changements de classe sur <html>
    const observer = new MutationObserver(() => {
      setTimeout(updateThemeColor, 50);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    
    // Update au focus de la fenêtre
    window.addEventListener('focus', updateThemeColor);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
      window.removeEventListener('focus', updateThemeColor);
    };
  }, []);
  
  return null;
}

