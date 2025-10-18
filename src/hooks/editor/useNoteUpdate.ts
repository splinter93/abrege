/**
 * Hook générique pour les mises à jour de notes
 * Remplace les patterns répétitifs de handleFontChange, handleA4ModeChange, etc.
 */

import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { logger, LogCategory } from '@/utils/logger';

/**
 * Type strict pour les mises à jour de notes
 * Définit tous les champs modifiables d'une note
 */
export type NoteUpdatePayload = Partial<{
  font_family: string;
  a4_mode: boolean;
  wide_mode: boolean;
  slash_lang: 'fr' | 'en';
  header_image: string | null;
  header_image_offset: number;
  header_image_blur: number;
  header_image_overlay: number;
  header_title_in_image: boolean;
  markdown_content: string;
  source_title: string;
  description: string;
}>;

/**
 * Options pour le hook useNoteUpdate
 */
export interface UseNoteUpdateOptions<T> {
  /** ID de la note à mettre à jour */
  noteId: string;
  
  /** ID de l'utilisateur */
  userId: string;
  
  /** Champ de la note à mettre à jour (ex: 'font_family', 'a4_mode') */
  field: string;
  
  /** Valeur actuelle du champ (pour rollback en cas d'erreur) */
  currentValue: T;
  
  /** Callback appelé en cas de succès */
  onSuccess?: (value: T) => void;
  
  /** Callback appelé en cas d'erreur */
  onError?: (error: Error, oldValue: T) => void;
  
  /** Message d'erreur personnalisé */
  errorMessage?: string;
  
  /** Si true, met à jour le store Zustand (défaut: true) */
  updateStore?: boolean;
}

/**
 * Hook générique pour mettre à jour un champ d'une note
 * avec gestion automatique des erreurs, rollback et mise à jour optimiste
 * 
 * @template T - Type de la valeur à mettre à jour
 * @param options - Configuration du hook
 * @returns Fonction de mise à jour du champ
 * 
 * @example
 * ```typescript
 * // Utilisation pour la police
 * const updateFont = useNoteUpdate({
 *   noteId,
 *   userId,
 *   field: 'font_family',
 *   currentValue: note?.font_family || 'Noto Sans',
 *   onSuccess: (font) => changeFont(font, 'all'),
 *   errorMessage: 'Erreur lors de la sauvegarde de la police'
 * });
 * 
 * // Appel
 * await updateFont('Inter');
 * ```
 */
export function useNoteUpdate<T>({
  noteId,
  userId,
  field,
  currentValue,
  onSuccess,
  onError,
  errorMessage = `Erreur lors de la sauvegarde de ${field}`,
  updateStore = true,
}: UseNoteUpdateOptions<T>) {
  const updateNote = useFileSystemStore(s => s.updateNote);
  
  return useCallback(
    async (newValue: T): Promise<void> => {
      const oldValue = currentValue;
      
      try {
        // Créer le payload typé strictement
        const payload: NoteUpdatePayload = { [field]: newValue };
        
        // 1. Mise à jour optimiste du store si demandé
        if (updateStore) {
          updateNote(noteId, payload);
        }
        
        // 2. Callback de succès (ex: changer la police en CSS)
        onSuccess?.(newValue);
        
        // 3. Appeler l'API
        await v2UnifiedApi.updateNote(noteId, payload, userId);
        
        if (process.env.NODE_ENV === 'development') {
          logger.debug(
            LogCategory.EDITOR,
            `✅ ${field} mis à jour:`,
            { oldValue, newValue }
          );
        }
      } catch (error) {
        // 4. Rollback en cas d'échec
        logger.error(
          LogCategory.EDITOR,
          `❌ Erreur mise à jour ${field}:`,
          error
        );
        
        // Restaurer l'ancienne valeur dans le store
        if (updateStore) {
          const rollbackPayload: NoteUpdatePayload = { [field]: oldValue };
          updateNote(noteId, rollbackPayload);
        }
        
        // Callback d'erreur (ex: restaurer la police CSS)
        onError?.(error as Error, oldValue);
        
        // Afficher un toast d'erreur
        toast.error(errorMessage);
      }
    },
    [
      noteId,
      userId,
      field,
      currentValue,
      onSuccess,
      onError,
      errorMessage,
      updateStore,
      updateNote,
    ]
  );
}

/**
 * Variante du hook pour les mises à jour d'images header
 * avec gestion spéciale des URL
 */
export function useHeaderImageUpdate({
  noteId,
  userId,
  field,
  currentValue,
  onSuccess,
  onError,
  errorMessage = `Erreur lors de la sauvegarde de ${field}`,
}: Omit<UseNoteUpdateOptions<number>, 'updateStore'>) {
  const updateNote = useFileSystemStore(s => s.updateNote);
  
  return useCallback(
    async (newValue: number): Promise<void> => {
      const oldValue = currentValue;
      
      try {
        // Créer le payload typé strictement
        const payload: NoteUpdatePayload = { [field]: newValue };
        
        // 1. Appeler l'API en premier pour valider
        await v2UnifiedApi.updateNote(noteId, payload, userId);
        
        // 2. Si succès, mettre à jour l'état local
        updateNote(noteId, payload);
        onSuccess?.(newValue);
      } catch (error) {
        // 3. En cas d'échec, restaurer l'ancienne valeur
        const errorObj = error as Error;
        logger.error(LogCategory.EDITOR, errorMessage, errorObj);
        onError?.(errorObj, oldValue);
        toast.error(errorMessage);
      }
    },
    [noteId, userId, field, currentValue, onSuccess, onError, errorMessage, updateNote]
  );
}

