'use client';

import { useEffect } from 'react';

/**
 * Composant client qui met à jour la meta tag theme-color
 * Détecte le thème actif et applique la bonne couleur
 */
export default function ThemeColor() {
  useEffect(() => {
    const updateThemeColor = () => {
      const html = document.documentElement;
      let color = '#121212'; // Dark par défaut
      
      // Détecter le thème actif
      if (html.classList.contains('theme-glass') || 
          html.classList.contains('chat-theme-glass')) {
        color = '#1a1625'; // Glass theme
      } else if (html.classList.contains('theme-light') || 
                 html.classList.contains('light')) {
        color = '#ffffff'; // Light theme
      } else {
        color = '#121212'; // Dark theme
      }
      
      console.log('[ThemeColor] Update:', color, 'Classes:', html.className);
      
      // Update la meta tag
      const metaTag = document.querySelector('meta[name="theme-color"]');
      if (metaTag) {
        metaTag.setAttribute('content', color);
      }
    };
    
    // Update initial immédiat
    updateThemeColor();
    
    // Re-update après 100ms pour s'assurer que les CSS sont chargés
    setTimeout(updateThemeColor, 100);
    setTimeout(updateThemeColor, 500);
    
    // Update périodique agressif (Android peut reset)
    const interval = setInterval(updateThemeColor, 1000);
    
    // Observer les changements de classe
    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    // Update au focus/visibilité
    const handleVisibility = () => {
      if (!document.hidden) {
        updateThemeColor();
      }
    };
    
    window.addEventListener('focus', updateThemeColor);
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
      window.removeEventListener('focus', updateThemeColor);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
  
  return null;
}

