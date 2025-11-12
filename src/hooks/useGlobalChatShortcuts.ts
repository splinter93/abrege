/**
 * Hook centralisé pour TOUS les raccourcis clavier globaux du chat
 * 
 * Raccourcis implémentés :
 * - Espace : Focus chat input (si pas déjà dans un input)
 * - / : Focus + ouvre menu prompts
 * - @ : Focus + ouvre menu notes
 * - Cmd+Enter (ou Ctrl+Enter) : Toggle Whisper (start/stop recording) - JAMAIS envoi message
 * - Esc : Ferme tous les menus ouverts
 * 
 * Guards :
 * - Espace, /, @ : Actifs uniquement si aucun input/textarea n'a le focus ET pas dans Canva
 * - Cmd+Enter, Esc : Fonctionnent partout
 * 
 * ✅ Guard Canva :
 * - Détecte si focus dans `.chat-canva-pane` (TipTap editor)
 * - Détecte si élément actif est `contenteditable="true"` (TipTap nodes)
 * - Évite que ESPACE/SLASH/@ capturent le focus pendant édition Canva
 * 
 * Séparation des responsabilités :
 * - Enter simple pendant recording : Géré par useChatActions (bloque envoi)
 * - Cmd+Enter : Géré ici (audio uniquement, stopPropagation pour éviter conflits)
 * 
 * Maintenabilité :
 * - Tous les raccourcis globaux centralisés ici (pas éparpillés)
 * - Documentation claire des conflits potentiels
 * - Guards stricts pour éviter les comportements inattendus
 */

import { useEffect } from 'react';
import type { AudioRecorderRef } from '@/components/chat/AudioRecorder';

interface UseGlobalChatShortcutsOptions {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  audioRecorderRef?: React.RefObject<AudioRecorderRef | null>; // ✅ Pour Whisper
  onOpenSlashMenu?: () => void;
  onOpenNoteSelector?: () => void;
  onCloseAllMenus?: () => void; // ✅ Pour Esc
  onValueChange?: (value: string, cursorPosition: number) => void; // ✅ Pour syncer state React
  enabled?: boolean;
}

export function useGlobalChatShortcuts({
  textareaRef,
  audioRecorderRef,
  onOpenSlashMenu,
  onOpenNoteSelector,
  onCloseAllMenus,
  onValueChange,
  enabled = true
}: UseGlobalChatShortcutsOptions) {
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // ✅ ESC : Ferme tous les menus + retire focus (fonctionne partout)
      if (e.key === 'Escape') {
        onCloseAllMenus?.();
        // Retirer le focus de l'élément actif (évite l'encadré bleu)
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }
      
      // ✅ CMD+ENTER : Toggle Whisper (fonctionne partout, même dans input)
      // ⚠️ Important : Vérifie !e.shiftKey pour ne pas interférer avec Cmd+Shift+Enter si besoin
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation(); // ✅ Empêche propagation vers autres handlers
        
        if (!audioRecorderRef?.current) return;
        
        // Toggle: si en recording → stop, sinon → start
        if (audioRecorderRef.current.isRecording()) {
          audioRecorderRef.current.stopRecording();
        } else {
          audioRecorderRef.current.startRecording();
        }
        return;
      }
      
      // ✅ Guard pour les autres raccourcis : Ne pas intercepter si déjà dans un input
      const activeElement = document.activeElement;
      const isInInput = activeElement?.tagName === 'INPUT' || 
                        activeElement?.tagName === 'TEXTAREA';
      
      // ✅ Guard Canva : Ne pas intercepter si focus dans l'éditeur Canva
      const isInCanva = activeElement?.closest('.chat-canva-pane') !== null ||
                        activeElement?.getAttribute('contenteditable') === 'true';
      
      // ✅ ESPACE : Focus chat input (si pas déjà dans un input OU dans Canva)
      if (e.key === ' ' && !isInInput && !isInCanva && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        textareaRef.current?.focus();
        return;
      }
      
      // ✅ / : Focus + insère "/" pour déclencher menu prompts (support AZERTY: Slash = Shift+Period)
      if (e.key === '/' && !isInInput && !isInCanva && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          // Insérer "/" au début UNIQUEMENT si pas déjà présent
          const current = textarea.value;
          const newValue = current.startsWith('/') ? current : '/' + current;
          textarea.value = newValue;
          textarea.setSelectionRange(1, 1);
          // Syncer state React + déclencher détection
          onValueChange?.(newValue, 1);
        }
        return;
      }
      
      // ✅ @ : Focus + ouvre menu notes (positionné au curseur)
      if (e.key === '@' && !isInInput && !isInCanva && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          // Positionner le curseur au début pour que le menu apparaisse bien
          textarea.setSelectionRange(0, 0);
          setTimeout(() => onOpenNoteSelector?.(), 10);
        }
        return;
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [enabled, textareaRef, audioRecorderRef, onOpenSlashMenu, onOpenNoteSelector, onCloseAllMenus, onValueChange]);
}


