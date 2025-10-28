/**
 * Hook pour charger les notes attachées avec timeout et gestion d'erreurs robuste
 * @module hooks/useNotesLoader
 */

import { useState, useCallback, useRef } from 'react';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Note sélectionnée avec métadonnées minimales
 */
export interface SelectedNote {
  id: string;
  slug: string;
  title: string;
  description?: string;
  word_count?: number;
}

/**
 * Note avec contenu complet (markdown)
 */
export interface NoteWithContent {
  id: string;
  slug: string;
  title: string;
  markdown_content: string;
}

/**
 * Statistiques de chargement des notes
 */
export interface NotesLoadStats {
  requested: number;
  loaded: number;
  failed: number;
  timedOut: boolean;
}

/**
 * Résultat du chargement des notes
 */
export interface NotesLoadResult {
  notes: NoteWithContent[];
  stats: NotesLoadStats;
}

/**
 * Options pour le chargement des notes
 */
export interface NotesLoaderOptions {
  timeoutMs?: number;
  token: string;
}

/**
 * Hook pour charger les notes attachées avec timeout et gestion d'erreurs
 * 
 * @returns {Object} Hook API
 * @returns {Function} loadNotes - Charge les notes avec timeout
 * @returns {boolean} isLoading - État de chargement
 * @returns {string | null} error - Erreur éventuelle
 */
export function useNotesLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Queue pour éviter les chargements simultanés des mêmes notes
  const loadQueue = useRef(new Map<string, Promise<NotesLoadResult>>());

  /**
   * Charge une note individuelle depuis l'API
   */
  const fetchNoteContent = useCallback(async (
    note: SelectedNote,
    token: string,
    index: number,
    total: number
  ): Promise<NoteWithContent | null> => {
    try {
      logger.dev(`[useNotesLoader] 📡 [${index + 1}/${total}] Fetch: ${note.title}`);

      const response = await fetch(`/api/v2/note/${note.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.warn(`[useNotesLoader] ⚠️ [${index + 1}/${total}] HTTP ${response.status} pour: ${note.title}`);
        return null;
      }

      const data = await response.json();
      const noteData = data.note || data;

      if (!noteData.markdown_content) {
        logger.warn(`[useNotesLoader] ⚠️ [${index + 1}/${total}] Pas de contenu pour: ${note.title}`);
        return null;
      }

      logger.dev(`[useNotesLoader] ✅ [${index + 1}/${total}] Chargé: ${note.title} (${noteData.markdown_content.length} chars)`);

      return {
        id: note.id,
        slug: note.slug,
        title: note.title,
        markdown_content: noteData.markdown_content
      };
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      logger.error(`[useNotesLoader] ❌ [${index + 1}/${total}] Exception pour ${note.title}:`, errorMsg);
      return null;
    }
  }, []);

  /**
   * Charge toutes les notes sélectionnées avec timeout et déduplication
   * 
   * @param notes - Notes à charger
   * @param options - Options (timeout, token)
   * @returns Résultat avec notes chargées et statistiques
   */
  const loadNotes = useCallback(async (
    notes: SelectedNote[],
    options: NotesLoaderOptions
  ): Promise<NotesLoadResult> => {
    const { timeoutMs = 5000, token } = options;

    if (notes.length === 0) {
      return {
        notes: [],
        stats: { requested: 0, loaded: 0, failed: 0, timedOut: false }
      };
    }

    // Générer un ID unique pour cette opération (déduplication)
    const operationId = notes.map(n => n.id).sort().join('-');
    
    // Vérifier si cette opération est déjà en cours
    if (loadQueue.current.has(operationId)) {
      logger.dev(`[useNotesLoader] 🔄 Déduplication: opération ${operationId} déjà en cours`);
      return loadQueue.current.get(operationId)!;
    }

    // Créer la promesse de chargement
    const loadPromise = loadNotesInternal(notes, options);
    
    // Stocker dans la queue
    loadQueue.current.set(operationId, loadPromise);
    
    try {
      const result = await loadPromise;
      return result;
    } finally {
      // Nettoyer la queue
      loadQueue.current.delete(operationId);
    }
  }, []);

  /**
   * Fonction interne de chargement (sans déduplication)
   */
  const loadNotesInternal = useCallback(async (
    notes: SelectedNote[],
    options: NotesLoaderOptions
  ): Promise<NotesLoadResult> => {
    const { timeoutMs = 5000, token } = options;

    setIsLoading(true);
    setError(null);

    try {
      logger.info(`[useNotesLoader] 📥 Chargement de ${notes.length} note(s)...`);

      // Créer les promesses de chargement
      const notePromises = notes.map((note, index) =>
        fetchNoteContent(note, token, index, notes.length)
      );

      // Créer une promesse de timeout
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      });

      // Course entre le chargement et le timeout
      let loadedNotes: (NoteWithContent | null)[];
      let timedOut = false;

      try {
        loadedNotes = await Promise.race([
          Promise.all(notePromises),
          timeoutPromise.then(() => {
            throw new Error('Timeout');
          })
        ]);
      } catch (timeoutError) {
        // Timeout atteint, prendre ce qui a été chargé
        logger.warn(`[useNotesLoader] ⏱️ Timeout de ${timeoutMs}ms atteint, utilisation des notes déjà chargées`);
        timedOut = true;
        
        // Attendre un peu pour récupérer les notes qui ont réussi
        await new Promise(resolve => setTimeout(resolve, 100));
        loadedNotes = await Promise.allSettled(notePromises).then(results =>
          results.map(result => result.status === 'fulfilled' ? result.value : null)
        );
      }

      // Filtrer les notes valides
      const validNotes = loadedNotes.filter((n): n is NoteWithContent => n !== null);

      const stats: NotesLoadStats = {
        requested: notes.length,
        loaded: validNotes.length,
        failed: notes.length - validNotes.length,
        timedOut
      };

      logger.info('[useNotesLoader] ✅ Chargement terminé:', stats);

      // Warning si échecs
      if (stats.failed > 0) {
        const warnMsg = `${stats.failed} note(s) n'ont pas pu être chargée(s)`;
        setError(warnMsg);
        logger.warn(`[useNotesLoader] ⚠️ ${warnMsg}`);
      }

      return { notes: validNotes, stats };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur lors du chargement des notes';
      setError(errorMsg);
      logger.error('[useNotesLoader] ❌ Erreur globale:', errorMsg);

      return {
        notes: [],
        stats: { requested: notes.length, loaded: 0, failed: notes.length, timedOut: false }
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchNoteContent]);

  /**
   * Clear l'erreur actuelle
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loadNotes,
    isLoading,
    error,
    clearError
  };
}

