/**
 * Hook regroupant tous les handlers du ChatInput
 * Réduit la complexité du composant principal
 * @module hooks/useChatInputHandlers
 */

import { useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import type { EditorPrompt } from '@/types/editorPrompts';

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
  processAndUploadImage
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
    const promptContent = prompt.prompt_template.replace('{selection}', '');
    setMessage(promptContent);
    closeMenu();
    setSlashQuery('');
    
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [textareaRef, closeMenu, setMessage, setSlashQuery]);

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

