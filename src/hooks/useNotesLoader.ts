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
  created_at?: string;
}

/**
 * Note avec contenu complet (markdown)
 */
export interface NoteWithContent {
  id: string;
  slug: string;
  title: string;
  markdown_content: string;
  updated_at?: string;  // Pour lastModified dans AttachedNotesFormatter
  created_at?: string;
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
   * Charge toutes les notes en batch (1 requête pour N notes)
   * ✅ OPTIMISATION: Remplace N requêtes individuelles par 1 requête batch
   */
  const fetchNotesBatch = useCallback(async (
    notes: SelectedNote[],
    token: string
  ): Promise<Map<string, NoteWithContent>> => {
    try {
      logger.dev(`[useNotesLoader] 📡 Batch fetch de ${notes.length} note(s)`);

      // ✅ API Batch : 1 requête pour toutes les notes
      const response = await fetch('/api/v2/notes/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteIds: notes.map(n => n.id)
        })
      });

      if (!response.ok) {
        logger.warn(`[useNotesLoader] ⚠️ Batch HTTP ${response.status}`);
        return new Map();
      }

      const data = await response.json();
      
      if (!data.success || !data.notes) {
        logger.warn('[useNotesLoader] ⚠️ Réponse batch invalide');
        return new Map();
      }

      // Construire Map pour lookup rapide
      const notesMap = new Map<string, NoteWithContent>();
      
      data.notes.forEach((noteData: {
        id: string;
        slug: string;
        title: string;
        markdown_content: string;
        updated_at?: string;
        created_at?: string;
      }) => {
        if (noteData.markdown_content) {
          notesMap.set(noteData.id, {
            id: noteData.id,
            slug: noteData.slug,
            title: noteData.title,
            markdown_content: noteData.markdown_content,
            updated_at: noteData.updated_at,
            created_at: noteData.created_at
          });
        }
      });

      logger.info(`[useNotesLoader] ✅ Batch chargé: ${notesMap.size}/${notes.length} notes`);

      return notesMap;
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      logger.error('[useNotesLoader] ❌ Exception batch:', errorMsg);
      return new Map();
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
   * ✅ OPTIMISATION: Utilise API batch (1 requête au lieu de N)
   */
  const loadNotesInternal = useCallback(async (
    notes: SelectedNote[],
    options: NotesLoaderOptions
  ): Promise<NotesLoadResult> => {
    const { timeoutMs = 3000, token } = options;

    setIsLoading(true);
    setError(null);

    try {
      logger.info(`[useNotesLoader] 📥 Chargement batch de ${notes.length} note(s)...`);

      // Créer une promesse de timeout
      const timeoutPromise = new Promise<Map<string, NoteWithContent>>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      });

      // Course entre le chargement batch et le timeout
      let notesMap: Map<string, NoteWithContent>;
      let timedOut = false;

      try {
        notesMap = await Promise.race([
          fetchNotesBatch(notes, token),
          timeoutPromise
        ]);
      } catch (timeoutError) {
        // Timeout atteint
        logger.warn(`[useNotesLoader] ⏱️ Timeout de ${timeoutMs}ms atteint`);
        timedOut = true;
        notesMap = new Map(); // Aucune note chargée
      }

      // Construire array de notes dans l'ordre demandé
      const validNotes: NoteWithContent[] = [];
      
      notes.forEach(note => {
        const loadedNote = notesMap.get(note.id);
        if (loadedNote) {
          validNotes.push(loadedNote);
        } else {
          logger.dev(`[useNotesLoader] ⚠️ Note non chargée: ${note.title}`);
        }
      });

      const stats: NotesLoadStats = {
        requested: notes.length,
        loaded: validNotes.length,
        failed: notes.length - validNotes.length,
        timedOut
      };

      logger.info('[useNotesLoader] ✅ Chargement batch terminé:', stats);

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
  }, [fetchNotesBatch]);

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

