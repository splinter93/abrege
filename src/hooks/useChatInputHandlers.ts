/**
 * Hook regroupant tous les handlers du ChatInput
 * Réduit la complexité du composant principal
 * @module hooks/useChatInputHandlers
 */

import { useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import type { EditorPrompt } from '@/types/editorPrompts';
import type { PromptMention } from '@/types/promptMention';

interface UseChatInputHandlersOptions {
  closeMenu: () => void;
  defaultReasoningLevel: 'advanced' | 'general' | 'fast' | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setMessage: (message: string) => void;
  setSlashQuery: (query: string) => void;
  setReasoningOverride: React.Dispatch<React.SetStateAction<'advanced' | 'general' | 'fast' | null>>;
  setShowImageSourceModal: (show: boolean) => void;
  openCamera: () => void;
  processAndUploadImage: (file: File) => Promise<boolean>;
  usedPrompts: PromptMention[]; // ✅ NOUVEAU : Liste des prompts utilisés
  setUsedPrompts: React.Dispatch<React.SetStateAction<PromptMention[]>>; // ✅ NOUVEAU
}

/**
 * Hook pour gérer tous les handlers du chat input
 */
export function useChatInputHandlers({
  closeMenu,
  defaultReasoningLevel,
  textareaRef,
  setMessage,
  setSlashQuery,
  setReasoningOverride,
  setShowImageSourceModal,
  openCamera,
  processAndUploadImage,
  usedPrompts,
  setUsedPrompts
}: UseChatInputHandlersOptions) {
  
  // File Menu handlers
  const handleLoadImageClick = useCallback(() => {
    closeMenu();
    setShowImageSourceModal(true);
  }, [closeMenu, setShowImageSourceModal]);

  const handleLoadFile = useCallback(() => {
    closeMenu();
    logger.dev('[ChatInput] Load file - TODO');
  }, [closeMenu]);

  const handleTakePhoto = useCallback(() => {
    closeMenu();
    openCamera();
  }, [closeMenu, openCamera]);

  const handleBrowseFiles = useCallback(() => {
    setShowImageSourceModal(false);
    logger.dev('[ChatInput] Browse Files - TODO');
  }, [setShowImageSourceModal]);

  // WebSearch handlers
  const handleNewsSearch = useCallback(() => {
    closeMenu();
    logger.dev('[ChatInput] News search - TODO');
  }, [closeMenu]);

  const handleBasicSearch = useCallback(() => {
    closeMenu();
    logger.dev('[ChatInput] Basic search - TODO');
  }, [closeMenu]);

  const handleAdvancedSearch = useCallback(() => {
    closeMenu();
    logger.dev('[ChatInput] Advanced search - TODO');
  }, [closeMenu]);

  // Reasoning handlers
  const handleFastReasoning = useCallback(() => {
    setReasoningOverride(prev => 
      (prev === 'fast' || defaultReasoningLevel === 'fast') ? null : 'fast'
    );
    closeMenu();
  }, [defaultReasoningLevel, closeMenu, setReasoningOverride]);

  const handleGeneralReasoning = useCallback(() => {
    setReasoningOverride(prev => 
      (prev === 'general' || defaultReasoningLevel === 'general') ? null : 'general'
    );
    closeMenu();
  }, [defaultReasoningLevel, closeMenu, setReasoningOverride]);

  const handleAdvancedReasoning = useCallback(() => {
    setReasoningOverride(prev => 
      (prev === 'advanced' || defaultReasoningLevel === 'advanced') ? null : 'advanced'
    );
    closeMenu();
  }, [defaultReasoningLevel, closeMenu, setReasoningOverride]);

  // Prompt handlers
  const handleSelectPrompt = useCallback((prompt: EditorPrompt) => {
    if (!textareaRef.current) return;
    
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = textareaRef.current.value.substring(0, cursorPosition);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex === -1) {
      logger.warn('[useChatInputHandlers] ⚠️ Pas de / trouvé');
      return;
    }
    
    // ✅ Remplacer /query par /slug + espace (exactement comme mentions avec @slug)
    const before = textareaRef.current.value.substring(0, lastSlashIndex);
    const after = textareaRef.current.value.substring(cursorPosition);
    const promptText = `/${prompt.slug}`; // ✅ NOUVEAU : Utilise slug au lieu de name
    const newMessage = before + promptText + ' ' + after;
    
    // ✅ Ajouter à usedPrompts[] (metadata légère - pas de template)
    const newPrompt: PromptMention = {
      id: prompt.id,
      slug: prompt.slug, // ✅ NOUVEAU
      name: prompt.name,
      description: prompt.description,
      context: prompt.context,
      agent_id: prompt.agent_id
      // ✅ PAS prompt_template (metadata légère, chargé par backend si besoin)
    };
    
    // Éviter doublons
    if (!usedPrompts.find(p => p.id === prompt.id)) {
      setUsedPrompts(prev => [...prev, newPrompt]);
    }
    
    // ✅ Calculer nouvelle position curseur (APRÈS /slug + espace)
    const newCursorPosition = lastSlashIndex + promptText.length + 1;
    
    logger.dev('[useChatInputHandlers] 📝 Prompt ajouté:', {
      promptSlug: prompt.slug,
      promptName: prompt.name,
      promptId: prompt.id,
      insertedText: `${promptText} `,
      newCursor: newCursorPosition,
      totalPrompts: usedPrompts.length + 1
    });
    
    setMessage(newMessage);
    closeMenu();
    setSlashQuery('');
    
    // ✅ Repositionner curseur APRÈS /slug
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newCursorPosition;
        textareaRef.current.selectionEnd = newCursorPosition;
        
        logger.dev('[useChatInputHandlers] ✅ Curseur positionné à', newCursorPosition);
      }
    }, 20);
  }, [textareaRef, closeMenu, setMessage, setSlashQuery, usedPrompts, setUsedPrompts]);

  // Browse Computer handler
  const handleBrowseComputer = useCallback(() => {
    setShowImageSourceModal(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        for (const file of fileArray) {
          await processAndUploadImage(file);
        }
      }
    };
    input.click();
  }, [setShowImageSourceModal, processAndUploadImage]);

  return {
    // File handlers
    handleLoadImageClick,
    handleLoadFile,
    handleTakePhoto,
    handleBrowseFiles,
    handleBrowseComputer,
    
    // WebSearch handlers
    handleNewsSearch,
    handleBasicSearch,
    handleAdvancedSearch,
    
    // Reasoning handlers
    handleFastReasoning,
    handleGeneralReasoning,
    handleAdvancedReasoning,
    
    // Prompt handlers
    handleSelectPrompt
  };
}

