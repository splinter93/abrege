'use client';

import { useEffect } from 'react';

/**
 * Composant client qui met à jour la meta tag theme-color
 * en fonction du thème actif (dark/light/glass)
 */
export default function ThemeColor() {
  useEffect(() => {
    const updateThemeColor = () => {
      const htmlElement = document.documentElement;
      const isDark = htmlElement.classList.contains('dark') || 
                     htmlElement.classList.contains('theme-dark');
      const isLight = htmlElement.classList.contains('light') || 
                      htmlElement.classList.contains('theme-light');
      
      // Couleurs selon le thème
      let themeColor = '#121212'; // Dark par défaut
      
      if (isLight) {
        themeColor = '#ffffff'; // Light mode
      } else if (isDark) {
        themeColor = '#121212'; // Dark mode
      }
      
      // Update la meta tag
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColor);
      }
    };
    
    // Update initial
    updateThemeColor();
    
    // Observer les changements de classe sur <html>
    const observer = new MutationObserver(() => {
      updateThemeColor();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);
  
  return null;
}

