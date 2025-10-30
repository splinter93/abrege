/**
 * Hook pour gérer les actions principales du ChatInput
 * Handlers pour input change, send, keydown, transcription
 * @module hooks/useChatActions
 */

import { useCallback } from 'react';
import type { ImageAttachment } from '@/types/image';
import type { SelectedNote, NoteWithContent } from './useNotesLoader';

interface UseChatActionsOptions {
  // État
  message: string;
  images: ImageAttachment[];
  selectedNotes: SelectedNote[];
  loading: boolean;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  
  // Setters
  setMessage: (message: string) => void;
  setSelectedNotes: (notes: SelectedNote[]) => void;
  setAudioError: (error: string | null) => void;
  
  // Fonctions
  detectCommands: (value: string, cursorPosition: number) => void;
  send: (message: string, images: ImageAttachment[], notes: SelectedNote[]) => Promise<boolean>;
  clearImages: () => void;
}

/**
 * Hook useChatActions
 * Gère les handlers d'actions (input, send, keydown, audio)
 */
export function useChatActions({
  message,
  images,
  selectedNotes,
  loading,
  disabled,
  textareaRef,
  setMessage,
  setSelectedNotes,
  setAudioError,
  detectCommands,
  send,
  clearImages
}: UseChatActionsOptions) {
  
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
   */
  const handleSend = useCallback(async () => {
    const hasContent = message.trim() || images.length > 0;
    if (hasContent && !loading && !disabled) {
      const success = await send(message.trim(), images, selectedNotes);
      if (success) {
        setMessage('');
        setSelectedNotes([]);
        clearImages();
        
        // ✅ Refocus la textarea pour continuer à taper (flow conversationnel)
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 50);
      }
    }
  }, [message, images, selectedNotes, loading, disabled, send, setMessage, setSelectedNotes, clearImages, textareaRef]);

  /**
   * Handler pour la touche Enter
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

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

