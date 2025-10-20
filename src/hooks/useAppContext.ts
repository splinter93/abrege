import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { AppContext } from '@/services/llm/types';

/**
 * @deprecated Utiliser useLLMContext() à la place
 * Ce hook est conservé pour compatibilité avec les anciens composants
 */
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
        // Nom temporaire - sera remplacé par les vraies données de l'API
      };
    }

    if (pathname.startsWith('/dossier/')) {
      // Page de dossier
      const dossierId = pathname.split('/')[2];
      return {
        type: 'folder',
        id: dossierId,
        name: `Dossier ${dossierId}`,
        // Nom temporaire - sera remplacé par les vraies données de l'API
      };
    }

    if (pathname.startsWith('/chat')) {
      // Page de chat
      return {
        type: 'chat_session',
        id: 'current',
        name: 'Session de chat',
        content: 'Assistant de chat pour la gestion de notes et dossiers'
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
  
  // Le contexte sera enrichi avec les vraies données de l'API dans une version future
  // Par exemple, récupérer le nom et contenu de l'article
  
  return baseContext;
}; 