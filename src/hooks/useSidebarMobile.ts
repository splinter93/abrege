import { useState, useEffect } from 'react';

/**
 * Hook pour gérer l'état de la sidebar mobile
 * Gère l'ouverture/fermeture et la détection de la taille d'écran
 */
const MOBILE_BREAKPOINT = 768;

export const useSidebarMobile = () => {
  const [isOpen, setIsOpen] = useState(false);
  // Premier rendu / SSR : on suppose mobile pour que la sidebar reste masquée (pas de flash)
  const [isMobile, setIsMobile] = useState(true);

  // Détecter si on est sur mobile (après montage)
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkIsMobile();

    // Écouter les changements de taille
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Fermer la sidebar si on passe en desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  const openSidebar = () => setIsOpen(true);
  const closeSidebar = () => setIsOpen(false);
  const toggleSidebar = () => setIsOpen(prev => !prev);

  return {
    isOpen,
    isMobile,
    openSidebar,
    closeSidebar,
    toggleSidebar
  };
};


