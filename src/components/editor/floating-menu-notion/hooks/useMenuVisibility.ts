/**
 * Hook pour la gestion de la visibilité du menu flottant
 */

import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { MenuPosition } from '../types';

interface UseMenuVisibilityParams {
  editor: Editor | null;
  position: MenuPosition;
  updatePosition: () => void;
  setPosition: React.Dispatch<React.SetStateAction<MenuPosition>>;
}

export function useMenuVisibility({
  editor,
  position,
  updatePosition,
  setPosition
}: UseMenuVisibilityParams) {
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const [selectedText, setSelectedText] = useState('');

  // Fermer les sous-menus quand le menu devient invisible
  useEffect(() => {
    if (!position.visible) {
      // Les états des sous-menus sont gérés par le composant parent
      // Ce hook notifie juste qu'il faut les fermer
    }
  }, [position.visible]);

  // Détecter les interactions avec drag handles
  useEffect(() => {
    if (!editor) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Vérifier si le clic est sur un drag handle
      if (target.closest('.notion-drag-handle') || 
          target.closest('.drag-handle-custom') ||
          target.closest('[data-drag-handle]')) {
        isDraggingRef.current = true;
        // Masquer le menu immédiatement
        setPosition(prev => ({ ...prev, visible: false }));
      }
    };

    const handleMouseUp = () => {
      // Réinitialiser après un court délai
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 200);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor, setPosition]);

  // Écouter les changements de sélection
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      // Ne pas mettre à jour si on est en train de drag
      if (isDraggingRef.current) {
        return;
      }
      
      updatePosition();
      
      // Extraire le texte sélectionné
      const { state } = editor;
      const { selection } = state;
      if (!selection.empty) {
        const text = state.doc.textBetween(selection.from, selection.to);
        setSelectedText(text);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      // Nettoyer le timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editor, updatePosition]);

  // Gérer le clic en dehors du menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // ✅ Ne cacher le menu que s'il est déjà visible
      // Évite de cacher le menu pendant un triple-clic
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && position.visible) {
        setPosition(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setPosition, position.visible]);

  return {
    menuRef,
    selectedText,
    isDraggingRef,
    timeoutRef
  };
}

