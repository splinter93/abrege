import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { AppContext } from '@/services/llm/types';

export const useAppContext = (): AppContext | null => {
  const pathname = usePathname();

  return useMemo(() => {
    if (!pathname) {
      return {
        type: 'chat_session' as const,
        id: 'default',
        name: 'Application Abrège',
      };
    }

    // Détecter le type de page basé sur l'URL
    if (pathname.startsWith('/note/')) {
      // Page d'article/note
      const noteId = pathname.split('/')[2];
      return {
        type: 'article',
        id: noteId,
        name: `Article ${noteId}`,
        // TODO: Récupérer le vrai nom et contenu depuis l'API
      };
    }

    if (pathname.startsWith('/dossier/')) {
      // Page de dossier
      const dossierId = pathname.split('/')[2];
      return {
        type: 'folder',
        id: dossierId,
        name: `Dossier ${dossierId}`,
        // TODO: Récupérer le vrai nom depuis l'API
      };
    }

    if (pathname.startsWith('/chat')) {
      // Page de chat
      return {
        type: 'chat_session',
        id: 'current',
        name: 'Session de chat',
      };
    }

    if (pathname.startsWith('/summary/')) {
      // Page de résumé
      const summaryId = pathname.split('/')[2];
      return {
        type: 'article',
        id: summaryId,
        name: `Résumé ${summaryId}`,
      };
    }

    // Page par défaut
    return {
      type: 'chat_session',
      id: 'default',
      name: 'Application Abrège',
    };
  }, [pathname]);
};

// Hook pour obtenir le contexte avec des données enrichies
export const useEnrichedAppContext = (): AppContext | null => {
  const baseContext = useAppContext();
  
  // TODO: Enrichir le contexte avec les vraies données depuis l'API
  // Par exemple, récupérer le nom et contenu de l'article
  
  return baseContext;
}; 