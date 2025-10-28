/**
 * Hook pour gérer l'état local du ChatInput
 * Centralise tous les états React (message, menus, erreurs)
 * @module hooks/useChatState
 */

import { useState, useEffect } from 'react';

interface UseChatStateOptions {
  editingContent?: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Hook useChatState
 * Gère tous les états locaux du chat input
 */
export function useChatState({ 
  editingContent, 
  textareaRef 
}: UseChatStateOptions) {
  
  // États principaux
  const [message, setMessage] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [reasoningOverride, setReasoningOverride] = useState<'advanced' | 'general' | 'fast' | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [atMenuPosition, setAtMenuPosition] = useState<{ top: number; left: number } | null>(null);
  
  // ✏️ Synchroniser le contenu quand on entre en mode édition
  useEffect(() => {
    if (editingContent) {
      setMessage(editingContent);
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = editingContent.length;
        textareaRef.current.selectionEnd = editingContent.length;
      }
    }
  }, [editingContent, textareaRef]);
  
  return {
    // Message
    message,
    setMessage,
    
    // Erreurs
    audioError,
    setAudioError,
    
    // Modales
    showImageSourceModal,
    setShowImageSourceModal,
    
    // Reasoning
    reasoningOverride,
    setReasoningOverride,
    
    // Slash commands
    slashQuery,
    setSlashQuery,
    
    // Menu position
    atMenuPosition,
    setAtMenuPosition
  };
}

