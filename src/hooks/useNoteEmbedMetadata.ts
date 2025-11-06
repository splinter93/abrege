/**
 * Hook pour charger les métadonnées d'une note embedée
 * 
 * Fonctionnalités:
 * - Fetch via API avec cache automatique
 * - Retry logic (max 2 retries avec backoff)
 * - Cleanup au unmount
 * - Support UUID et slug
 * 
 * @param noteRef - ID ou slug de la note
 * @param depth - Profondeur actuelle (pour logging/debug)
 * @returns Métadonnées, états de chargement, et fonction refetch
 */

import { useState, useEffect, useCallback, useRef, useTransition, startTransition } from 'react';
import type { NoteEmbedMetadata, UseNoteEmbedMetadataResult } from '@/types/noteEmbed';
import { MAX_FETCH_RETRIES, RETRY_BASE_DELAY_MS, FETCH_TIMEOUT_MS } from '@/types/noteEmbed';
import { noteEmbedCache } from '@/services/noteEmbedCacheService';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Options du hook
 */
interface UseNoteEmbedMetadataOptions {
  noteRef: string;
  depth: number;
  enabled?: boolean;
}

/**
 * Hook pour charger les métadonnées d'une note embedée
 */
export function useNoteEmbedMetadata(
  options: UseNoteEmbedMetadataOptions
): UseNoteEmbedMetadataResult {
  const { noteRef, depth, enabled = true } = options;
  
  const [note, setNote] = useState<NoteEmbedMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch avec retry et backoff exponentiel
   */
  const fetchWithRetry = useCallback(async (
    url: string,
    token: string | null,
    retryCount = 0
  ): Promise<NoteEmbedMetadata> => {
    try {
      // Créer AbortController pour timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      
      abortControllerRef.current = controller;

      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Note introuvable');
        }
        if (response.status === 403) {
          throw new Error('Accès refusé');
        }
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();

      // L'API V2 retourne { success, note } OU directement { id, title, ... }
      const noteData = data.note || data;
      
      if (!noteData || !noteData.id) {
        throw new Error('Réponse invalide');
      }

      // Mapper les champs de l'API vers NoteEmbedMetadata
      const metadata: NoteEmbedMetadata = {
        id: noteData.id,
        title: noteData.title || noteData.source_title,
        slug: noteData.slug,
        public_url: noteData.public_url,
        header_image: noteData.header_image,
        markdown_content: noteData.markdown_content || '',
        html_content: noteData.html_content,
        created_at: noteData.created_at,
        updated_at: noteData.updated_at,
        share_settings: noteData.share_settings,
        user_id: noteData.user_id
      };

      return metadata;

    } catch (err) {
      // Si abort (timeout ou unmount), ne pas retry
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Timeout');
      }

      // Retry si échec et retries restants
      if (retryCount < MAX_FETCH_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
        logger.dev(`[useNoteEmbedMetadata] ♻️ Retry ${retryCount + 1}/${MAX_FETCH_RETRIES} dans ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, token, retryCount + 1);
      }

      throw err;
    }
  }, []);

  /**
   * Charger les métadonnées de la note
   */
  const loadMetadata = useCallback(async () => {
    if (!enabled || !noteRef) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Vérifier le cache
      const cached = noteEmbedCache.get(noteRef);
      if (cached) {
        if (isMountedRef.current) {
          // ✅ FIX: Wrapper dans startTransition pour éviter flushSync error
          startTransition(() => {
            setNote(cached);
            setLoading(false);
          });
        }
        return;
      }

      // 2. Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || null;

      // 3. Fetch depuis l'API avec retry
      const url = `/api/v2/note/${encodeURIComponent(noteRef)}?fields=all`;
      const metadata = await fetchWithRetry(url, token);

      if (!isMountedRef.current) return;

      // 4. Mettre en cache
      noteEmbedCache.set(noteRef, metadata);

      // 5. Mettre à jour l'état
      // ✅ FIX: Wrapper dans startTransition pour éviter flushSync error
      startTransition(() => {
        setNote(metadata);
        setError(null);
      });

      logger.dev('[useNoteEmbedMetadata] ✅ Note chargée:', metadata.title);

    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      // ✅ FIX: Wrapper dans startTransition pour éviter flushSync error
      startTransition(() => {
        setError(errorMessage);
        setNote(null);
      });

      logger.error('[useNoteEmbedMetadata] ❌ Erreur chargement:', {
        noteRef,
        depth,
        error: errorMessage
      });
    } finally {
      if (isMountedRef.current) {
        // ✅ FIX: Wrapper dans startTransition pour éviter flushSync error
        startTransition(() => {
          setLoading(false);
        });
      }
    }
  }, [noteRef, depth, enabled, fetchWithRetry]);

  /**
   * Refetch manuel (pour invalidation)
   */
  const refetch = useCallback(async () => {
    // Invalider le cache d'abord
    noteEmbedCache.invalidate(noteRef);
    await loadMetadata();
  }, [noteRef, loadMetadata]);

  /**
   * Charger au mount et si noteRef change
   */
  useEffect(() => {
    // ✅ FIX React 18 StrictMode: Reset mounted flag à chaque mount
    isMountedRef.current = true;
    loadMetadata();

    return () => {
      // Cleanup: annuler fetch en cours ET marquer comme démonté
      isMountedRef.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadMetadata]);

  return {
    note,
    loading,
    error,
    refetch
  };
}

