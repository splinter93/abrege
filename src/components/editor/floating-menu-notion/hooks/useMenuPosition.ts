/**
 * Hook pour le calcul de la position du menu flottant
 */

import { useState, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { simpleLogger as logger } from '@/utils/logger';
import type { MenuPosition } from '../types';

export function useMenuPosition(editor: Editor | null) {
  const [position, setPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    visible: false
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = useCallback(() => {
    // Annuler le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!editor || editor.isDestroyed) {
      setPosition(prev => ({ ...prev, visible: false }));
      return;
    }

    const { state } = editor;
    const { selection } = state;

    // Vérifier si la sélection est vide
    if (selection.empty) {
      timeoutRef.current = setTimeout(() => {
        setPosition(prev => ({ ...prev, visible: false }));
      }, 100);
      return;
    }

    // Vérifier si un drag handle est actif
    const activeElement = document.activeElement;
    const isDragHandleActive = activeElement?.closest('.notion-drag-handle') || 
                               activeElement?.closest('.notion-plus-btn') ||
                               activeElement?.closest('.notion-drag-handle-btn');

    if (isDragHandleActive) {
      timeoutRef.current = setTimeout(() => {
        setPosition(prev => ({ ...prev, visible: false }));
      }, 100);
      return;
    }

    // Extraire le texte sélectionné
    const text = state.doc.textBetween(selection.from, selection.to);
    if (!text || text.trim().length === 0) {
      timeoutRef.current = setTimeout(() => {
        setPosition(prev => ({ ...prev, visible: false }));
      }, 100);
      return;
    }

    // Délai avant d'afficher le menu (évite les sélections rapides comme triple-clic)
    timeoutRef.current = setTimeout(() => {
      // Calculer la position du menu
      try {
        const { view } = editor;
        const { from, to } = selection;

        logger.dev('[MenuPosition] Calcul position pour sélection:', {
          from,
          to,
          text: text.substring(0, 50),
          selectionType: selection.constructor.name
        });

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

        logger.dev('[MenuPosition] Menu positionné:', { top: relativeTop - menuHeight - 10, left: relativeLeft });
      } catch (error) {
        logger.error('[MenuPosition] ❌ Erreur calcul position:', error);
        setPosition(prev => ({ ...prev, visible: false }));
      }
    }, 100);
  }, [editor]);

  return { position, updatePosition, setPosition };
}

