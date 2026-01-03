/**
 * Utilitaires pour les sélections de texte du canvas
 * Fonctions pures pour créer et émettre des événements de sélection
 * @module utils/canvasSelectionUtils
 */

import type { CanvasSelection } from '@/types/canvasSelection';
import { logger, LogCategory } from '@/utils/logger';

/**
 * Crée un objet CanvasSelection à partir des paramètres
 * 
 * @param text - Texte sélectionné
 * @param noteId - ID de la note (optionnel)
 * @param noteSlug - Slug de la note (optionnel)
 * @param noteTitle - Titre de la note (optionnel)
 * @param startPos - Position de début (optionnel)
 * @param endPos - Position de fin (optionnel)
 * @returns Objet CanvasSelection
 */
export function createCanvasSelection(
  text: string,
  noteId?: string,
  noteSlug?: string,
  noteTitle?: string,
  startPos?: number,
  endPos?: number
): CanvasSelection {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    noteId,
    noteSlug,
    noteTitle,
    startPos,
    endPos,
    timestamp: new Date().toISOString()
  };
}

/**
 * Émet un événement 'canvas-selection' avec la sélection
 * 
 * @param selection - Sélection à émettre
 * @returns true si l'événement a été émis, false sinon
 */
export function emitCanvasSelection(selection: CanvasSelection): boolean {
  if (!selection.text || selection.text.trim().length < 3) {
    logger.warn(LogCategory.EDITOR, '[canvasSelectionUtils] Sélection trop courte, ignorée', {
      textLength: selection.text?.length || 0
    });
    return false;
  }

  try {
    const event = new CustomEvent<CanvasSelection>('canvas-selection', {
      detail: selection,
      bubbles: true
    });
    
    document.dispatchEvent(event);

    logger.debug(LogCategory.EDITOR, '[canvasSelectionUtils] ✅ Événement canvas-selection émis', {
      selectionId: selection.id,
      textLength: selection.text.length,
      textPreview: selection.text.substring(0, 50),
      noteId: selection.noteId,
      noteTitle: selection.noteTitle
    });

    return true;
  } catch (error) {
    logger.error(LogCategory.EDITOR, '[canvasSelectionUtils] ❌ Erreur lors de l\'émission de l\'événement', {
      error: error instanceof Error ? error.message : String(error),
      selectionId: selection.id
    });
    return false;
  }
}

/**
 * Crée et émet une sélection de canvas en une seule opération
 * 
 * @param text - Texte sélectionné
 * @param noteId - ID de la note (optionnel)
 * @param noteSlug - Slug de la note (optionnel)
 * @param noteTitle - Titre de la note (optionnel)
 * @param startPos - Position de début (optionnel)
 * @param endPos - Position de fin (optionnel)
 * @returns true si l'événement a été émis, false sinon
 */
export function createAndEmitCanvasSelection(
  text: string,
  noteId?: string,
  noteSlug?: string,
  noteTitle?: string,
  startPos?: number,
  endPos?: number
): boolean {
  const selection = createCanvasSelection(text, noteId, noteSlug, noteTitle, startPos, endPos);
  return emitCanvasSelection(selection);
}

