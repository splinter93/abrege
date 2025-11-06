/**
 * Hook useCreateNote
 * 
 * Gère la création rapide d'une nouvelle note depuis la sidebar
 * - Crée une note vierge dans le classeur actif
 * - Navigate automatiquement vers la note créée
 * - Gestion loading + erreurs
 * 
 * @module hooks/editor/useCreateNote
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { V2UnifiedApi } from '@/services/V2UnifiedApi';
import { simpleLogger as logger } from '@/utils/logger';

interface CreateNoteOptions {
  /** ID du classeur où créer la note */
  classeurId: string;
  /** Titre par défaut de la note */
  defaultTitle?: string;
}

interface UseCreateNoteReturn {
  /** Créer une nouvelle note et naviguer vers elle */
  createNote: () => Promise<void>;
  /** Création en cours */
  isCreating: boolean;
  /** Erreur éventuelle */
  error: string | null;
}

/**
 * Hook useCreateNote
 * 
 * @example
 * ```typescript
 * const { createNote, isCreating, error } = useCreateNote({
 *   classeurId: 'classeur-123',
 *   defaultTitle: 'Nouvelle note'
 * });
 * 
 * // Dans un handler
 * await createNote();
 * ```
 */
export function useCreateNote({
  classeurId,
  defaultTitle = 'Nouvelle note'
}: CreateNoteOptions): UseCreateNoteReturn {
  
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createNote = useCallback(async () => {
    // Validation : classeurId requis
    if (!classeurId) {
      logger.warn('[useCreateNote] ⚠️  Pas de classeur sélectionné');
      setError('Veuillez sélectionner un classeur');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      logger.info('[useCreateNote] 🚀 Création nouvelle note', {
        classeurId,
        titre: defaultTitle
      });

      // Créer la note via V2UnifiedApi
      const api = V2UnifiedApi.getInstance();
      const result = await api.createNote({
        source_title: defaultTitle,
        notebook_id: classeurId,
        markdown_content: '', // Note vierge
      });

      if (!result.success || !result.note) {
        throw new Error(result.error || 'Erreur création note');
      }

      const newNoteId = result.note.id;

      logger.info('[useCreateNote] ✅ Note créée:', {
        noteId: newNoteId,
        titre: result.note.source_title,
        duration: result.duration
      });

      // Navigation vers la note créée
      // ✅ scroll: false pour éviter le flash
      router.push(`/private/note/${newNoteId}`, { scroll: false });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      logger.error('[useCreateNote] ❌ Erreur création note:', {
        error: errorMessage,
        classeurId
      });
      
      setError(errorMessage);
      
      // TODO: Afficher toast erreur
    } finally {
      setIsCreating(false);
    }
  }, [classeurId, defaultTitle, router]);

  return {
    createNote,
    isCreating,
    error
  };
}

