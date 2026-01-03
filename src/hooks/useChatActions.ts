/**
 * Hook pour gérer les actions principales du ChatInput
 * Handlers pour input change, send, keydown, transcription
 * @module hooks/useChatActions
 */

import { useCallback, startTransition } from 'react';
import type { ImageAttachment } from '@/types/image';
import type { SelectedNote, NoteWithContent } from './useNotesLoader';
import type { AudioRecorderRef } from '@/components/chat/AudioRecorder';
import type { NoteMention } from '@/types/noteMention';
import type { PromptMention } from '@/types/promptMention';
import { useMentionDeletion } from './useMentionDeletion';
import { validateMessage } from '@/utils/chatValidation';
import { chatError } from '@/utils/chatToast';

interface UseChatActionsOptions {
  // État
  message: string;
  images: ImageAttachment[];
  selectedNotes: SelectedNote[];
  mentions: NoteMention[];
  usedPrompts: PromptMention[]; // ✅ NOUVEAU
  loading: boolean;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  audioRecorderRef?: React.RefObject<AudioRecorderRef | null>;
  
  // Setters
  setMessage: (message: string) => void;
  setSelectedNotes: (notes: SelectedNote[]) => void;
  setMentions: (mentions: NoteMention[]) => void;
  setUsedPrompts: (prompts: PromptMention[]) => void; // ✅ NOUVEAU
  setAudioError: (error: string | null) => void;
  
  // Fonctions
  detectCommands: (value: string, cursorPosition: number) => void;
  send: (message: string, images: ImageAttachment[], notes: SelectedNote[], mentions: NoteMention[], usedPrompts: PromptMention[], reasoningOverride?: 'advanced' | 'general' | 'fast' | null) => Promise<boolean>; // ✅ NOUVEAU param reasoningOverride
  clearImages: () => void;
  
  // État reasoning
  reasoningOverride?: 'advanced' | 'general' | 'fast' | null; // ✅ NOUVEAU : Override reasoning
  
  // Menus (pour bloquer Enter)
  showMentionMenu?: boolean;
  showSlashMenu?: boolean;
}

/**
 * Hook useChatActions
 * Gère les handlers d'actions (input, send, keydown, audio)
 */
export function useChatActions({
  message,
  images,
  selectedNotes,
  mentions,
  usedPrompts,
  loading,
  disabled,
  textareaRef,
  audioRecorderRef,
  setMessage,
  setSelectedNotes,
  setMentions,
  setUsedPrompts,
  setAudioError,
  detectCommands,
  send,
  clearImages,
  showMentionMenu,
  showSlashMenu,
  reasoningOverride
}: UseChatActionsOptions) {
  
  // ✅ Hook pour suppression atomique des mentions ET prompts
  const { handleKeyDown: handleMentionDeletion } = useMentionDeletion({
    message,
    setMessage,
    mentions,
    setMentions,
    usedPrompts,
    setUsedPrompts,
    textareaRef
  });
  
  /**
   * Handler pour les changements d'input
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setMessage(value);
    detectCommands(value, cursorPosition);
  }, [setMessage, detectCommands]);

  /**
   * Handler pour l'envoi de message
   * ✅ REFACTO : Envoie mentions[] directement
   * ✅ SÉCURITÉ : Bloque l'envoi si enregistrement audio en cours
   * ✅ VALIDATION : Valide le message avant envoi
   */
  const handleSend = useCallback(async () => {
    // ✅ BLOQUER si enregistrement audio en cours
    if (audioRecorderRef?.current?.isRecording()) {
      return;
    }
    
    // ✅ VALIDATION : Vérifier le message avant envoi
    const validation = validateMessage(message, images.length, selectedNotes.length);
    
    if (!validation.valid) {
      // Afficher l'erreur de validation
      chatError(validation.error || 'Erreur de validation', {
        duration: 5000
      });
      return;
    }
    
    // ✅ Avertissement si message très long (mais valide)
    if (validation.warning) {
      // On peut afficher un toast info, mais on continue l'envoi
      // (optionnel, pour ne pas spammer l'utilisateur)
    }
    
    const hasContent = message.trim() || images.length > 0;
    if (hasContent && !loading && !disabled) {
      const success = await send(message.trim(), images, selectedNotes, mentions, usedPrompts, reasoningOverride);
      if (success) {
        setMessage('');
        setSelectedNotes([]);
        setMentions([]); // ✅ Clear mentions après envoi
        setUsedPrompts([]); // ✅ Clear prompts après envoi
        clearImages();
        
        // ✅ Refocus la textarea pour continuer à taper (flow conversationnel)
        // ⚠️ SAUF sur mobile/tactile pour éviter le clavier qui apparaît
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouchDevice) {
          setTimeout(() => {
            textareaRef.current?.focus();
          }, 50);
        }
      }
    }
  }, [message, images, selectedNotes, mentions, usedPrompts, reasoningOverride, loading, disabled, send, setMessage, setSelectedNotes, setMentions, setUsedPrompts, clearImages, textareaRef, audioRecorderRef]);
  
  /**
   * Handler pour la touche Enter dans textarea
   * 
   * Gestion stricte :
   * - Enter simple UNIQUEMENT (pas Shift+Enter, pas Cmd+Enter, pas Ctrl+Enter)
   * - Shift+Enter → Nouvelle ligne (comportement natif textarea)
   * - Cmd/Ctrl+Enter → Audio toggle (géré par useGlobalChatShortcuts, pas ici)
   * 
   * Sécurité :
   * - Bloque si menu mention/slash ouvert (laisse le menu gérer)
   * - Bloque si recording en cours (pas d'envoi pendant enregistrement)
   * 
   * Bonus :
   * - Intercepte aussi Backspace/Delete pour mentions atomiques
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ✅ Vérifier suppression atomique mentions AVANT Enter
    handleMentionDeletion(e);
    
    // Si event prevented (mention supprimée), stop ici
    if (e.defaultPrevented) {
      return;
    }
    
    // ✅ ENTER pour envoyer : UNIQUEMENT Enter simple (pas Cmd+Enter, ni Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      // ✅ NOUVEAU : Bloquer Enter si un menu est ouvert (le menu gère Enter)
      if (showMentionMenu || showSlashMenu) {
        // Ne pas preventDefault ici, laisser le menu gérer
        return;
      }
      
      // ✅ SÉCURITÉ : Si en recording, bloquer complètement (ne rien faire)
      if (audioRecorderRef?.current?.isRecording()) {
        e.preventDefault();
        return; // ✅ Pas d'envoi pendant enregistrement
      }
      
      e.preventDefault();
      
      // Envoyer normalement (handleSend a sa propre vérification)
      handleSend();
    }
  }, [handleMentionDeletion, handleSend, audioRecorderRef, showMentionMenu, showSlashMenu]);

  /**
   * Handler pour la transcription audio complétée
   */
  const handleTranscriptionComplete = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text) {
      setAudioError(null);
      return;
    }

    const textarea = textareaRef.current;
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const insertTextWithSpacing = (before: string, inserted: string, after: string) => {
      const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
      const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);
      const prefix = needsSpaceBefore ? ' ' : '';
      const suffix = needsSpaceAfter ? ' ' : '';
      return `${prefix}${inserted}${suffix}`;
    };

    const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
      const previousHeight = element.style.height;
      element.style.transition = 'none';
      element.style.height = 'auto';
      const maxHeight = 200;
      const minHeight = 18;
      const nextHeight = Math.max(
        minHeight,
        Math.min(element.scrollHeight, maxHeight)
      );
      element.style.height = previousHeight;
      requestAnimationFrame(() => {
        element.style.transition = 'height 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
        element.style.height = `${nextHeight}px`;
      });
    };

    if (textarea) {
      const selectionStart = textarea.selectionStart ?? textarea.value.length;
      const selectionEnd = textarea.selectionEnd ?? textarea.value.length;
      const currentValue = textarea.value;
      const before = currentValue.slice(0, selectionStart);
      const after = currentValue.slice(selectionEnd);
      const insertion = insertTextWithSpacing(before, text, after);
      const nextValue = before + insertion + after;
      const caretPosition = before.length + insertion.length;

      textarea.value = nextValue;
      textarea.setSelectionRange(caretPosition, caretPosition);
      if (!isTouchDevice) {
        textarea.focus({ preventScroll: true });
      }
      adjustTextareaHeight(textarea);

      startTransition(() => {
        setMessage(nextValue);
        setAudioError(null);
        detectCommands(nextValue, caretPosition);
      });

      return;
    }

    // Fallback : textarea non disponible
    const nextValue = `${message}${message ? ' ' : ''}${text}`;
    startTransition(() => {
      setMessage(nextValue);
      setAudioError(null);
      detectCommands(nextValue, nextValue.length);
    });
  }, [textareaRef, setMessage, setAudioError, detectCommands, message]);

  return {
    handleInputChange,
    handleSend,
    handleKeyDown,
    handleTranscriptionComplete
  };
}

