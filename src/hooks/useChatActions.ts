/**
 * Hook pour gérer les actions principales du ChatInput
 * Handlers pour input change, send, keydown, transcription
 * @module hooks/useChatActions
 */

import { useCallback } from 'react';
import type { ImageAttachment } from '@/types/image';
import type { SelectedNote, NoteWithContent } from './useNotesLoader';
import type { AudioRecorderRef } from '@/components/chat/AudioRecorder';
import { useMentionDeletion } from './useMentionDeletion';

interface UseChatActionsOptions {
  // État
  message: string;
  images: ImageAttachment[];
  selectedNotes: SelectedNote[];
  mentions: import('@/types/noteMention').NoteMention[]; // ✅ NOUVEAU
  loading: boolean;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  audioRecorderRef?: React.RefObject<AudioRecorderRef | null>;
  
  // Setters
  setMessage: (message: string) => void;
  setSelectedNotes: (notes: SelectedNote[]) => void;
  setMentions: (mentions: import('@/types/noteMention').NoteMention[]) => void; // ✅ NOUVEAU
  setAudioError: (error: string | null) => void;
  
  // Fonctions
  detectCommands: (value: string, cursorPosition: number) => void;
  send: (message: string, images: ImageAttachment[], notes: SelectedNote[], mentions: import('@/types/noteMention').NoteMention[]) => Promise<boolean>; // ✅ NOUVEAU param
  clearImages: () => void;
  
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
  loading,
  disabled,
  textareaRef,
  audioRecorderRef,
  setMessage,
  setSelectedNotes,
  setMentions,
  setAudioError,
  detectCommands,
  send,
  clearImages,
  showMentionMenu,
  showSlashMenu
}: UseChatActionsOptions) {
  
  // ✅ Hook pour suppression atomique des mentions
  const { handleKeyDown: handleMentionDeletion } = useMentionDeletion({
    message,
    setMessage,
    mentions,
    setMentions,
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
   */
  const handleSend = useCallback(async () => {
    const hasContent = message.trim() || images.length > 0;
    if (hasContent && !loading && !disabled) {
      const success = await send(message.trim(), images, selectedNotes, mentions);
      if (success) {
        setMessage('');
        setSelectedNotes([]);
        setMentions([]); // ✅ Clear mentions après envoi
        clearImages();
        
        // ✅ Refocus la textarea pour continuer à taper (flow conversationnel)
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 50);
      }
    }
  }, [message, images, selectedNotes, mentions, loading, disabled, send, setMessage, setSelectedNotes, setMentions, clearImages, textareaRef]);
  
  /**
   * Handler pour la touche Enter
   * ✅ Si en recording → Stop Whisper
   * ✅ Sinon → Envoyer le message
   * ✅ NOUVEAU : Intercepte aussi Backspace/Delete pour mentions atomiques
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ✅ Vérifier suppression atomique mentions AVANT Enter
    handleMentionDeletion(e);
    
    // Si event prevented (mention supprimée), stop ici
    if (e.defaultPrevented) {
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      // ✅ NOUVEAU : Bloquer Enter si un menu est ouvert (le menu gère Enter)
      if (showMentionMenu || showSlashMenu) {
        // Ne pas preventDefault ici, laisser le menu gérer
        return;
      }
      
      e.preventDefault();
      
      // Si en recording, juste stop (pas d'envoi)
      if (audioRecorderRef?.current?.isRecording()) {
        audioRecorderRef.current.stopRecording();
        return;
      }
      
      // Sinon, envoyer normalement
      handleSend();
    }
  }, [handleMentionDeletion, handleSend, audioRecorderRef, showMentionMenu, showSlashMenu]);

  /**
   * Handler pour la transcription audio complétée
   */
  const handleTranscriptionComplete = useCallback((text: string) => {
    setMessage(prev => prev + (prev ? ' ' : '') + text);
    setAudioError(null);
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (!isTouchDevice) {
      const timeoutId = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            textareaRef.current.value.length,
            textareaRef.current.value.length
          );
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [textareaRef, setMessage, setAudioError]);

  return {
    handleInputChange,
    handleSend,
    handleKeyDown,
    handleTranscriptionComplete
  };
}

