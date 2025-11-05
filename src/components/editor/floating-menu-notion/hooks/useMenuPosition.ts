/**
 * Hook pour le calcul de la position du menu flottant
 */

import { useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { simpleLogger as logger } from '@/utils/logger';
import type { MenuPosition } from '../types';

export function useMenuPosition(editor: Editor | null) {
  const [position, setPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    visible: false
  });

  const updatePosition = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    const { state } = editor;
    const { selection } = state;

    // Vérifier si la sélection est vide
    if (selection.empty) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    // Détecter le type de sélection
    const selectionType = selection.constructor.name;
    if (selectionType === 'NodeSelection') {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    // Vérifier si un drag handle est actif
    const activeElement = document.activeElement;
    const isDragHandleActive = activeElement?.closest('.notion-drag-handle') || 
                               activeElement?.closest('.notion-plus-btn') ||
                               activeElement?.closest('.notion-drag-handle-btn');

    if (isDragHandleActive) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    // Extraire le texte sélectionné
    const text = state.doc.textBetween(selection.from, selection.to);
    if (!text || text.trim().length === 0) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    // Calculer la position du menu
    try {
      const { view } = editor;
      const { from, to } = selection;

      // Récupérer l'élément éditeur
      const editorElement = view.dom;
      const editorRect = editorElement.getBoundingClientRect();

      // Calculer les coordonnées de début et fin de sélection
      const startCoords = view.coordsAtPos(from);
      const endCoords = view.coordsAtPos(to);

      // Position relative à l'éditeur
      const relativeTop = startCoords.top - editorRect.top;
      const relativeLeft = (startCoords.left + endCoords.left) / 2 - editorRect.left;

      // Calculer position finale avec offset
      const menuHeight = 60;
      setPosition({
        top: relativeTop - menuHeight - 10,
        left: relativeLeft,
        visible: true
      });
    } catch (error) {
      logger.dev('[MenuPosition] Erreur calcul position:', error);
      setPosition(prev => ({ ...prev, visible: false }));
    }
  }, [editor]);

  return { position, updatePosition, setPosition };
}

