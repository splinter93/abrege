/**
 * Hook pour gérer la détection des commandes spéciales dans l'input
 * Détecte les slash commands (/) et les mentions (@)
 * @module hooks/useInputDetection
 */

import { useCallback } from 'react';

interface InputDetectionOptions {
  showNoteSelector: boolean;
  showSlashMenu: boolean;
  openMenu: (menu: 'slash' | 'notes') => void;
  closeMenu: () => void;
  setSlashQuery: (query: string) => void;
  setNoteSearchQuery: (query: string) => void;
  setAtMenuPosition: (position: { top: number; left: number } | null) => void;
  // ✅ NOUVEAU : Mention menu (séparé)
  showMentionMenu: boolean;
  setShowMentionMenu: (show: boolean) => void;
  setMentionMenuPosition: (position: { top: number; left: number } | null) => void;
  setMentionSearchQuery: (query: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Hook pour détecter les slash commands et mentions dans l'input
 */
export function useInputDetection({
  showNoteSelector,
  showSlashMenu,
  openMenu,
  closeMenu,
  setSlashQuery,
  setNoteSearchQuery,
  setAtMenuPosition,
  showMentionMenu,
  setShowMentionMenu,
  setMentionMenuPosition,
  setMentionSearchQuery,
  textareaRef
}: InputDetectionOptions) {
  
  /**
   * Handler principal pour détecter les commandes
   */
  const detectCommands = useCallback((
    value: string,
    cursorPosition: number
  ) => {
    // 🎯 Détection slash command au DÉBUT uniquement
    if (value.startsWith('/')) {
      if (value.includes(' ')) {
        closeMenu();
        setSlashQuery('');
      } else {
        const query = value.substring(1).toLowerCase();
        setSlashQuery(query);
        openMenu('slash');
      }
      
      if (showNoteSelector) {
        closeMenu();
        setNoteSearchQuery('');
      }
      return; // Skip mention detection
    } 
    
    // Fermer slash menu si on ne commence plus par "/"
    if (showSlashMenu) {
      closeMenu();
      setSlashQuery('');
    }
    
    // 🎯 Détection @ mentions PARTOUT dans le texte
    // ✅ NOUVEAU : Utilise MentionMenu séparé (pas NoteSelector)
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        // Fermer mention menu si espace/newline après @
        if (showMentionMenu) {
          setShowMentionMenu(false);
          setMentionSearchQuery('');
          setNoteSearchQuery(''); // ✅ Clear aussi noteSearchQuery
          setMentionMenuPosition(null);
        }
      } else {
        // Calculer position du menu AU-DESSUS du @
        if (textareaRef.current) {
          const textBeforeAt = value.substring(0, lastAtIndex);
          const lines = textBeforeAt.split('\n');
          const lineIndex = lines.length - 1;
          const textInLine = lines[lineIndex] || '';
          
          const textarea = textareaRef.current;
          const computedStyle = window.getComputedStyle(textarea);
          
          // ✅ MESURE RÉELLE de la largeur du texte avec Canvas
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            const fontSize = computedStyle.fontSize;
            const fontFamily = computedStyle.fontFamily;
            context.font = `${fontSize} ${fontFamily}`;
            
            // Mesurer la largeur réelle du texte jusqu'au @
            const textWidth = context.measureText(textInLine).width;
            let left = textWidth + 16; // +16 pour padding textarea
            
            // ✅ Empêcher le menu de déborder à droite
            const menuWidth = 320;
            const textareaWidth = textarea.offsetWidth;
            const maxLeft = textareaWidth - menuWidth - 16;
            
            if (left > maxLeft) {
              left = Math.max(16, maxLeft);
            }
            
            // Position verticale
            const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
            const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
            const top = (lineIndex * lineHeight) + paddingTop - textarea.scrollTop;
            
            setMentionMenuPosition({ top, left });
          }
        }
        
        // ✅ IMPORTANT : Synchroniser avec noteSearchQuery pour déclencher la vraie recherche
        const query = textAfterAt.toLowerCase();
        setMentionSearchQuery(query);
        setNoteSearchQuery(query); // ✅ Déclenche useNoteSearch
        setShowMentionMenu(true);
      }
    } else {
      // Fermer mention menu si plus de @
      if (showMentionMenu && !value.includes('@')) {
        setShowMentionMenu(false);
        setMentionSearchQuery('');
        setNoteSearchQuery(''); // ✅ Clear aussi noteSearchQuery
        setMentionMenuPosition(null);
      }
    }
  }, [
    showNoteSelector,
    showSlashMenu,
    showMentionMenu,
    openMenu,
    closeMenu,
    setSlashQuery,
    setNoteSearchQuery,
    setAtMenuPosition,
    setShowMentionMenu,
    setMentionMenuPosition,
    setMentionSearchQuery,
    textareaRef
  ]);

  return { detectCommands };
}

