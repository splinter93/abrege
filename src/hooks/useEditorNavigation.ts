/**
 * Hook useEditorNavigation
 * 
 * Gère la navigation entre notes dans l'éditeur
 * - Switch note avec vérification unsaved changes
 * - Update store (useFileSystemStore)
 * - Client-side navigation (Next.js router)
 * 
 * @module hooks/useEditorNavigation
 */

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { simpleLogger as logger } from '@/utils/logger';

interface UseEditorNavigationOptions {
  /** ID de la note actuellement ouverte */
  currentNoteId: string;
  /** Fonction pour vérifier si l'éditeur a des modifications non sauvegardées */
  hasUnsavedChanges: () => boolean;
  /** Callback optionnel appelé avant navigation (pour cleanup, etc.) */
  onBeforeNavigate?: () => void;
}

interface UseEditorNavigationReturn {
  /** Switch vers une autre note */
  switchNote: (noteId: string) => Promise<void>;
  /** Navigation en cours (lock) */
  isNavigating: boolean;
}

/**
 * Hook useEditorNavigation
 * 
 * @example
 * ```typescript
 * const { switchNote, isNavigating } = useEditorNavigation({
 *   currentNoteId: noteId,
 *   hasUnsavedChanges: () => editor?.state.doc.content.size > 0,
 *   onBeforeNavigate: () => logger.dev('Navigating...')
 * });
 * 
 * // Dans un handler
 * await switchNote('note-123');
 * ```
 */
export function useEditorNavigation({
  currentNoteId,
  hasUnsavedChanges,
  onBeforeNavigate
}: UseEditorNavigationOptions): UseEditorNavigationReturn {
  
  const router = useRouter();
  
  // Lock pour éviter navigation simultanée
  const isNavigatingRef = useRef(false);

  /**
   * Switch vers une autre note
   * 
   * Flow:
   * 1. Check si déjà sur cette note → skip
   * 2. Check lock (navigation déjà en cours)
   * 3. Check unsaved changes → confirm si nécessaire
   * 4. Lock navigation
   * 5. Callback onBeforeNavigate (cleanup)
   * 6. Client-side navigation (Next.js router)
   * 7. Unlock navigation
   */
  const switchNote = useCallback(async (noteId: string) => {
    // 1. Skip si déjà sur cette note
    if (noteId === currentNoteId) {
      logger.dev('[useEditorNavigation] ⏭️  Déjà sur cette note, skip', { noteId });
      return;
    }

    // 2. Check lock (navigation déjà en cours)
    if (isNavigatingRef.current) {
      logger.warn('[useEditorNavigation] ⚠️  Navigation déjà en cours, skip');
      return;
    }

    // 3. Check unsaved changes
    const hasChanges = hasUnsavedChanges();
    if (hasChanges) {
      // ⚠️ WARN utilisateur
      const confirmed = window.confirm(
        'Vous avez des modifications non sauvegardées. Voulez-vous continuer sans sauvegarder ?'
      );
      
      if (!confirmed) {
        logger.dev('[useEditorNavigation] ❌ Navigation annulée par l\'utilisateur');
        return;
      }
    }

    try {
      // 4. Lock navigation
      isNavigatingRef.current = true;
      
      logger.info('[useEditorNavigation] 🚀 Switch note', {
        from: currentNoteId,
        to: noteId
      });

      // 5. Callback onBeforeNavigate (cleanup, etc.)
      if (onBeforeNavigate) {
        onBeforeNavigate();
      }

      // 6. Client-side navigation (Next.js App Router)
      // ✅ scroll: false pour garder la position et éviter le flash
      // Format: /private/note/[noteId]
      router.push(`/private/note/${noteId}`, { scroll: false });
      
    } catch (error) {
      logger.error(
        `[useEditorNavigation] ❌ Erreur navigation vers note ${noteId}`,
        error
      );
      // TODO: Afficher toast erreur
    } finally {
      // 7. Unlock après un délai (éviter double-click)
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    }
  }, [currentNoteId, hasUnsavedChanges, onBeforeNavigate, router]);

  return {
    switchNote,
    isNavigating: isNavigatingRef.current
  };
}

