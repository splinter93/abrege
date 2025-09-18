import { useState, useEffect } from 'react';

/**
 * Hook pour gérer l'état de la sidebar mobile
 * Gère l'ouverture/fermeture et la détection de la taille d'écran
 */
export const useSidebarMobile = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Vérifier au montage
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


