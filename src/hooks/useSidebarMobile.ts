import { useState, useEffect, useCallback } from 'react';

const MOBILE_BREAKPOINT = 768;

export const useSidebarMobile = () => {
  // SSR-safe: commence à false pour éviter le flash burger sur desktop
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fermer si on passe en desktop
  useEffect(() => {
    if (!isMobile && isOpen) setIsOpen(false);
  }, [isMobile, isOpen]);

  // Bloquer le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = isMobile && isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isOpen, mounted]);

  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);
  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, isMobile, openSidebar, closeSidebar, toggleSidebar };
};


