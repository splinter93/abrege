import { useState, useEffect, useCallback } from 'react';

/** Breakpoint au-dessous duquel le panneau paramètres devient un drawer */
const LG_BREAKPOINT = 1024;

export const useParamsPanelMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < LG_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fermer si on repasse en desktop
  useEffect(() => {
    if (!isMobile && isOpen) setIsOpen(false);
  }, [isMobile, isOpen]);

  // Bloquer le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = isMobile && isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isOpen, mounted]);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, isMobile, openPanel, closePanel, togglePanel };
};
