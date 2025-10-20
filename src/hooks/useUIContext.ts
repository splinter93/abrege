/**
 * @deprecated Utiliser useLLMContext() à la place
 * Ce hook est conservé pour compatibilité avec les anciens composants
 * 
 * Hook pour collecter le contexte de l'interface utilisateur
 * Utilisé pour l'injection de contexte dans les agents
 */

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './useAuth';
import { contextCollector, UIContext } from '@/services/llm/ContextCollector';

export interface UseUIContextOptions {
  activeNote?: {
    id: string;
    slug: string;
    name: string;
  };
  activeClasseur?: {
    id: string;
    name: string;
  };
  activeFolder?: {
    id: string;
    name: string;
  };
}

/**
 * Hook pour collecter le contexte UI complet
 * ✅ CORRECTION : Toujours retourner un contexte, même sans utilisateur
 */
export function useUIContext(options: UseUIContextOptions = {}): UIContext {
  const { user } = useAuth();
  const pathname = usePathname();

  return useMemo(() => {
    // ✅ CORRECTION : Toujours retourner un contexte, même sans utilisateur
    const context: UIContext = {
      user: user ? {
        name: user.name || user.username || 'Utilisateur',
        username: user.username,
        email: user.email
      } : {
        name: 'Utilisateur anonyme',
        username: undefined,
        email: undefined
      },
      page: contextCollector.detectPageType(pathname),
      ...options
    };

    return context;
  }, [user, pathname, options.activeNote, options.activeClasseur, options.activeFolder]);
}

/**
 * Hook pour générer la section de contexte pour injection
 * ✅ CORRECTION : uiContext ne peut plus être null
 */
export function useContextSection(options: UseUIContextOptions = {}) {
  const uiContext = useUIContext(options);

  return useMemo(() => {
    return contextCollector.generateContextSection(uiContext);
  }, [uiContext]);
}

/**
 * Hook pour collecter le contexte depuis les paramètres d'URL
 * ✅ CORRECTION : Simplifié et synchrone
 */
export function useUIContextFromParams(
  params: { [key: string]: string | string[] | undefined } = {},
  options: UseUIContextOptions = {}
) {
  const { user } = useAuth();
  const pathname = usePathname();

  return useMemo(() => {
    return contextCollector.collectFromURLParams(user, pathname, params);
  }, [user, pathname, params, options]);
}
