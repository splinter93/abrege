/**
 * Hook pour gérer le menu de commande (Command Palette)
 * 
 * Fonctionnalités :
 * - Recherche de notes avec debounce
 * - Navigation vers notes ou chat
 * - Gestion de l'état ouvert/fermé
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md :
 * - TypeScript strict (interfaces explicites)
 * - Debounce inputs (300ms)
 * - Gestion erreurs robuste
 * - Logging structuré
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from './useDebounce';
import { simpleLogger as logger } from '@/utils/logger';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';

/**
 * Résultat de recherche de note
 */
export interface CommandPaletteNote {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  updated_at?: string;
}

/**
 * Option du menu de commande
 */
export interface CommandPaletteOption {
  id: string;
  type: 'note' | 'action';
  title: string;
  description?: string;
  icon?: string;
  action: () => void;
}

/**
 * Options du hook
 */
export interface UseCommandPaletteOptions {
  enabled?: boolean;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Retour du hook
 */
export interface UseCommandPaletteReturn {
  isOpen: boolean;
  query: string;
  results: CommandPaletteOption[];
  isLoading: boolean;
  isLoadingRecent: boolean;
  selectedIndex: number;
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  executeSelected: () => void;
}

/**
 * Hook pour gérer le menu de commande
 */
export function useCommandPalette(
  options: UseCommandPaletteOptions = {}
): UseCommandPaletteReturn {
  const { enabled = true, isOpen: externalIsOpen, onOpen, onClose } = options;
  const router = useRouter();
  
  // Utiliser l'état externe si fourni, sinon état interne
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<CommandPaletteNote[]>([]);
  const [recentNotes, setRecentNotes] = useState<CommandPaletteNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const debouncedQuery = useDebounce(query, 300);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Récupérer les headers d'authentification
   */
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    try {
      if (typeof window === 'undefined') {
        return { 'Content-Type': 'application/json' };
      }

      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'command_palette'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      return headers;
    } catch (error) {
      logger.error('[useCommandPalette] Erreur récupération headers auth:', error);
      return { 'Content-Type': 'application/json' };
    }
  }, []);

  /**
   * Rechercher des notes
   */
  const searchNotes = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouveau AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);

    try {
      const headers = await getAuthHeaders();
      
      const searchParams = new URLSearchParams({
        q: searchQuery.trim(),
        type: 'notes',
        limit: '10'
      });

      const response = await fetch(`/api/v2/search?${searchParams.toString()}`, {
        headers,
        signal
      });

      if (signal.aborted) {
        return;
      }

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json() as {
        success: boolean;
        results?: Array<{
          type: string;
          id: string;
          slug: string;
          title: string;
          excerpt?: string;
          created_at?: string;
          updated_at?: string;
        }>;
      };

      if (signal.aborted) {
        return;
      }

      if (data.success && data.results) {
        const formattedNotes: CommandPaletteNote[] = data.results
          .filter((r) => r.type === 'note')
          .map((note) => ({
            id: note.id,
            slug: note.slug || note.id,
            title: note.title || 'Sans titre',
            excerpt: note.excerpt,
            updated_at: note.updated_at || note.created_at
          }));
        
        setNotes(formattedNotes);
      } else {
        setNotes([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Requête annulée, ignorer
        return;
      }
      logger.error('[useCommandPalette] Erreur recherche notes:', error);
      setNotes([]);
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [getAuthHeaders]);

  /**
   * Charger les notes récentes
   */
  const loadRecentNotes = useCallback(async () => {
    setIsLoadingRecent(true);

    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch('/api/v2/note/recent?limit=5', {
        headers,
        signal: abortControllerRef.current?.signal
      });

      if (response.ok) {
        const data = await response.json() as {
          success: boolean;
          notes?: Array<{
            id: string;
            slug: string;
            source_title: string;
            updated_at?: string;
            created_at?: string;
          }>;
        };

        if (data.success && data.notes) {
          const formattedNotes: CommandPaletteNote[] = data.notes.map((note) => ({
            id: note.id,
            slug: note.slug || note.id,
            title: note.source_title || 'Sans titre',
            updated_at: note.updated_at || note.created_at
          }));
          
          setRecentNotes(formattedNotes);
        } else {
          setRecentNotes([]);
        }
      } else {
        setRecentNotes([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      logger.error('[useCommandPalette] Erreur chargement notes récentes:', error);
      setRecentNotes([]);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [getAuthHeaders]);

  /**
   * Charger les notes récentes quand le menu s'ouvre
   */
  useEffect(() => {
    if (!isOpen || !enabled) {
      return;
    }

    // Charger les notes récentes seulement si pas de query
    if (!query.trim() || query.length < 2) {
      void loadRecentNotes();
    }
  }, [isOpen, enabled, query, loadRecentNotes]);

  /**
   * Effectuer la recherche avec debounce
   */
  useEffect(() => {
    if (!isOpen || !enabled) {
      return;
    }

    // Si query >= 2 caractères, rechercher
    // Sinon, on garde les notes récentes
    if (debouncedQuery.trim().length >= 2) {
      void searchNotes(debouncedQuery);
    } else {
      // Réinitialiser les résultats de recherche mais garder les notes récentes
      setNotes([]);
    }
  }, [debouncedQuery, isOpen, enabled, searchNotes]);

  /**
   * Construire les options du menu
   */
  const buildOptions = useCallback((): CommandPaletteOption[] => {
    const options: CommandPaletteOption[] = [];

    // Action : Ouvrir le chat (toujours disponible)
    options.push({
      id: 'action-chat',
      type: 'action',
      title: 'Ouvrir le chat',
      description: 'Accéder à l\'interface de chat',
      icon: '💬',
      action: () => {
        router.push('/chat');
        if (externalIsOpen === undefined) {
          setInternalIsOpen(false);
        }
        setQuery('');
        onClose?.();
      }
    });

    // ✅ Afficher les notes de recherche si query active, sinon les notes récentes
    const notesToShow = (query.trim().length >= 2) ? notes : recentNotes;

    // Notes à afficher (recherche ou récentes)
    notesToShow.forEach((note) => {
      options.push({
        id: `note-${note.id}`,
        type: 'note',
        title: note.title,
        description: note.excerpt,
        icon: '📝',
        action: () => {
          router.push(`/private/note/${note.slug || note.id}`);
          if (externalIsOpen === undefined) {
            setInternalIsOpen(false);
          }
          setQuery('');
          onClose?.();
        }
      });
    });

    return options;
  }, [notes, recentNotes, query, router, externalIsOpen, onClose]);

  const results = buildOptions();

  /**
   * Ouvrir le menu
   */
  const open = useCallback(() => {
    if (!enabled) return;
    if (externalIsOpen === undefined) {
      setInternalIsOpen(true);
    }
    setQuery('');
    setSelectedIndex(0);
    onOpen?.();
  }, [enabled, externalIsOpen, onOpen]);

  /**
   * Fermer le menu
   */
  const close = useCallback(() => {
    if (externalIsOpen === undefined) {
      setInternalIsOpen(false);
    }
    setQuery('');
    setSelectedIndex(0);
    setNotes([]);
    setRecentNotes([]);
    
    // Annuler les requêtes en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    onClose?.();
  }, [externalIsOpen, onClose]);

  /**
   * Sélectionner l'option suivante
   */
  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % results.length);
  }, [results.length]);

  /**
   * Sélectionner l'option précédente
   */
  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
  }, [results.length]);

  /**
   * Exécuter l'option sélectionnée
   */
  const executeSelected = useCallback(() => {
    if (results.length === 0 || selectedIndex < 0 || selectedIndex >= results.length) {
      return;
    }

    const selected = results[selectedIndex];
    selected.action();
  }, [results, selectedIndex]);

  // Réinitialiser l'index de sélection quand les résultats changent
  useEffect(() => {
    if (results.length > 0 && selectedIndex >= results.length) {
      setSelectedIndex(0);
    }
  }, [results.length, selectedIndex]);

  return {
    isOpen,
    query,
    results,
    isLoading,
    isLoadingRecent,
    selectedIndex,
    open,
    close,
    setQuery,
    selectNext,
    selectPrevious,
    executeSelected
  };
}

