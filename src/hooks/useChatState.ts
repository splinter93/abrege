/**
 * Hook pour gérer l'état local du ChatInput
 * Centralise tous les états React (message, menus, erreurs)
 * ✅ REFACTO : Ajout mentions[] (comme images[])
 * @module hooks/useChatState
 */

import { useState, useEffect } from 'react';
import type { NoteMention } from '@/types/noteMention';

interface UseChatStateOptions {
  editingContent?: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Hook useChatState
 * Gère tous les états locaux du chat input
 * ✅ NOUVEAU : State mentions[] séparé du texte (comme images[])
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
  
  // ✅ NOUVEAU : Mentions légères (state séparé comme images[])
  const [mentions, setMentions] = useState<NoteMention[]>([]);
  
  // ✅ NOUVEAU : Mention menu (séparé de NoteSelector)
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionMenuPosition, setMentionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  
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
    
    // Mentions
    mentions,
    setMentions,
    
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
    setAtMenuPosition,
    
    // Mention menu (séparé)
    showMentionMenu,
    setShowMentionMenu,
    mentionMenuPosition,
    setMentionMenuPosition,
    mentionSearchQuery,
    setMentionSearchQuery
  };
}

