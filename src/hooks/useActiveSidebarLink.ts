import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

/**
 * Hook pour gérer l'état actif des liens de la sidebar
 * Détermine quel lien est actif basé sur le pathname actuel
 */
export const useActiveSidebarLink = () => {
  const pathname = usePathname();

  const activeLink = useMemo(() => {
    // Correspondance exacte ou par préfixe pour les pages principales
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/private/dashboard')) return 'dashboard';
    if (pathname.startsWith('/private/dossiers')) return 'dossiers';
    if (pathname.startsWith('/private/shared')) return 'shared';
    if (pathname.startsWith('/private/files')) return 'files';
    if (pathname.startsWith('/private/trash')) return 'trash';
    if (pathname.startsWith('/private/settings')) return 'settings';
    if (pathname.startsWith('/private/account')) return 'account';
    
    return null;
  }, [pathname]);

  return activeLink;
};

