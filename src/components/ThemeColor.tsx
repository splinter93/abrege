'use client';

import { useEffect, useRef } from 'react';
import { simpleLogger } from '@/utils/logger';

/**
 * Composant client qui met à jour la meta tag theme-color
 * Détecte le thème actif et applique la bonne couleur
 * ⚡ Optimisé pour performance : debouncing + passive listeners
 */
export default function ThemeColor() {
  const prevColorRef = useRef<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    const updateThemeColor = () => {
      const html = document.documentElement;
      const body = document.body;
      let color = '#121212'; // Dark par défaut
      
      // MODE STANDALONE (PWA installée) = Noir pur
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true; // iOS
      
      if (isStandalone) {
        color = '#000000'; // Noir pur pour app installée
        html.style.setProperty('background', '#000000', 'important');
        body.style.setProperty('background', '#000000', 'important');
      }
      // Détecter le thème actif (browser uniquement)
      else if (html.classList.contains('theme-blue') || 
          html.classList.contains('chat-theme-blue')) {
        color = '#0f1419'; // Blue theme
      } else if (html.classList.contains('theme-light') || 
                 html.classList.contains('light')) {
        color = '#ffffff'; // Light theme
      } else {
        color = '#121212'; // Dark theme
      }
      
      // Update seulement si couleur a changé
      if (color !== prevColorRef.current) {
        prevColorRef.current = color;
        const metaTag = document.querySelector('meta[name="theme-color"]');
        if (metaTag) {
          metaTag.setAttribute('content', color);
        }
        simpleLogger.dev(`[ThemeColor] Updated: ${color}`);
      }
    };
    
    // ⚡ Debounced avec RAF pour synchroniser avec browser paint
    const debouncedUpdate = () => {
      // Cancel RAF/timeout précédents
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Utiliser RAF + timeout pour éviter updates pendant scroll
      updateTimeoutRef.current = setTimeout(() => {
        rafIdRef.current = requestAnimationFrame(updateThemeColor);
      }, 100);
    };
    
    // Update initial immédiat
    updateThemeColor();
    
    // Re-update après chargement CSS
    setTimeout(updateThemeColor, 100);
    
    // ⚡ MutationObserver DEBOUNCED (évite saccades de scroll)
    const observer = new MutationObserver(debouncedUpdate);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    // ⚡ Event listeners DEBOUNCED
    const handleVisibility = () => {
      if (!document.hidden) {
        debouncedUpdate();
      }
    };
    
    window.addEventListener('focus', debouncedUpdate, { passive: true } as any);
    document.addEventListener('visibilitychange', handleVisibility, { passive: true } as any);
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      observer.disconnect();
      window.removeEventListener('focus', debouncedUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
  
  return null;
}

