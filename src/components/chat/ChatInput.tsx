/**
 * Input principal du chat - Version optimisée < 300 lignes
 * Composant léger qui délègue le rendu aux sous-composants
 * @module components/chat/ChatInput
 */

'use client';
import React, { useEffect } from 'react';
import type { ImageAttachment, MessageContent } from '@/types/image';
import type { EditorPrompt } from '@/types/editorPrompts';
import { useAuth } from '@/hooks/useAuth';
import { useEditorPrompts } from '@/hooks/useEditorPrompts';
import { useMenus } from '@/hooks/useMenus';
import { useNotesLoader, type NoteWithContent } from '@/hooks/useNotesLoader';
import { useNoteSearch } from '@/hooks/useNoteSearch';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useChatInputHandlers } from '@/hooks/useChatInputHandlers';
import { usePdfInChat } from '@/hooks/usePdfInChat';
import { useMultipleMenusClickOutside } from '@/hooks/useMenuClickOutside';
import { useInputDetection } from '@/hooks/useInputDetection';
import { useChatSend } from '@/hooks/useChatSend';
import { useNoteSelectionWithTextarea } from '@/hooks/useNoteSelectionWithTextarea';
import { useTextareaAutoResize } from '@/hooks/useTextareaAutoResize';
import { useChatPrompts } from '@/hooks/useChatPrompts';
import { useChatState } from '@/hooks/useChatState';
import { useChatActions } from '@/hooks/useChatActions';
import { useGlobalChatShortcuts } from '@/hooks/useGlobalChatShortcuts';
import { isValidCanvasSelection } from '@/utils/canvasSelectionUtils';
import { isImageUrlUploaded } from '@/utils/imageUtils';
import { logger, LogCategory } from '@/utils/logger';
import ChatInputContent from './ChatInputContent';
import ChatInputToolbar from './ChatInputToolbar';
import SlashMenu from './SlashMenu';
import MentionMenu from './MentionMenu';
import PromptArgumentsModal from './PromptArgumentsModal';
import ScriviaFilePicker from './ScriviaFilePicker';
import { parsePromptPlaceholders } from '@/utils/promptPlaceholders';

interface ChatInputProps {
  onSend: (message: string | MessageContent, images?: ImageAttachment[], notes?: NoteWithContent[], mentions?: import('@/types/noteMention').NoteMention[], usedPrompts?: import('@/types/promptMention').PromptMention[], canvasSelections?: import('@/types/canvasSelection').CanvasSelection[], reasoningOverride?: 'advanced' | 'general' | 'fast' | null) => void;
  onStopGeneration?: () => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
  sessionId: string;
  currentAgentModel?: string;
  editingMessageId?: string | null;
  editingContent?: string;
  onCancelEdit?: () => void;
  isVocalMode?: boolean;
  onToggleVocalMode?: () => void;
}

// Helper: mapper modèle → niveau reasoning
const getReasoningLevelFromModel = (model?: string): 'advanced' | 'general' | 'fast' | null => {
  if (!model) return null;
  if (model.includes('grok-4-0709')) return 'advanced';
  if (
    model.includes('grok-4-1-fast-reasoning') ||
    model.includes('grok-4-fast-reasoning')
  ) {
    return 'general';
  }
  if (
    model.includes('grok-4-1-fast-non-reasoning') ||
    model.includes('grok-4-fast-non-reasoning') ||
    model === 'grok-4-fast'
  ) {
    return 'fast';
  }
  return null;
};

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend,
  onStopGeneration,
  loading, 
  textareaRef, 
  disabled = false, 
  placeholder = "Commencez à discuter...", 
  sessionId, 
  currentAgentModel,
  editingMessageId,
  editingContent,
  onCancelEdit,
  isVocalMode = false,
  onToggleVocalMode
}) => {
  // 🎯 Hooks auth & prompts
  const { getAccessToken, user } = useAuth();
  const { prompts: allPrompts } = useEditorPrompts(user?.id);
  const { loadNotes } = useNotesLoader();
  
  // ✅ Ref pour contrôler AudioRecorder via raccourci clavier
  const audioRecorderRef = React.useRef<import('./AudioRecorder').AudioRecorderRef>(null);
  
  // 🎯 Hook menus
  const {
    showFileMenu,
    showWebSearchMenu,
    showReasoningMenu,
    showNoteSelector,
    showSlashMenu,
    openMenu,
    closeMenu,
    toggleMenu
  } = useMenus();
  
  // 🎯 Hook recherche notes
  const {
    selectedNotes,
    setSelectedNotes,
    noteSearchQuery,
    setNoteSearchQuery,
    recentNotes,
    searchedNotes,
    isSearching,
    handleSelectNote,
    handleRemoveNote,
    loadRecentNotes
  } = useNoteSearch({ getAccessToken });

  // 🎯 Hook PDF dans le chat (parse → note → attach)
  const { handlePdfFiles, isParsingPdf, pdfError, clearPdfError } = usePdfInChat({
    setSelectedNotes,
  });
  
  // 🎯 Hook upload images
  const {
    images,
    uploadError,
    setUploadError,
    isDragging,
    cameraInputRef,
    processAndUploadImage,
    addImageFromUrl,
    removeImage,
    clearImages,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleCameraCapture,
    openCamera
  } = useImageUpload({ sessionId, onPdfDrop: handlePdfFiles });
  
  // 🎯 Hook état local (nouveau)
  const {
    message,
    setMessage,
    mentions,
    setMentions,
    usedPrompts,
    setUsedPrompts,
    canvasSelections,
    setCanvasSelections,
    audioError,
    setAudioError,
    showImageSourceModal,
    setShowImageSourceModal,
    reasoningOverride,
    setReasoningOverride,
    slashQuery,
    setSlashQuery,
    slashMenuPosition,
    setSlashMenuPosition,
    atMenuPosition,
    setAtMenuPosition,
    showMentionMenu,
    setShowMentionMenu,
    mentionMenuPosition,
    setMentionMenuPosition,
    mentionSearchQuery,
    setMentionSearchQuery
  } = useChatState({ editingContent, textareaRef });

  const [pendingPrompt, setPendingPrompt] = React.useState<EditorPrompt | null>(null);
  const [pendingPromptInitialValues, setPendingPromptInitialValues] = React.useState<Record<string, string> | undefined>();
  
  // 🎯 État pour le file picker Scrivia
  const [showScriviaFilePicker, setShowScriviaFilePicker] = React.useState(false);
  // 🎯 Modale "Charger un fichier" (même style que ImageSourceModal)
  const [showFileSourceModal, setShowFileSourceModal] = React.useState(false);
  
  const defaultReasoningLevel = getReasoningLevelFromModel(currentAgentModel);
  
  // 🎯 Hook prompts
  const { filteredChatPrompts } = useChatPrompts({
    allPrompts,
    slashQuery
  });
  
  // 🎯 Hook handlers
  const {
    handleLoadImageClick,
    handleLoadFile,
    handleTakePhoto,
    handleBrowseFiles: handleBrowseFilesFromHook,
    handleBrowseComputer,
    handleNewsSearch,
    handleBasicSearch,
    handleAdvancedSearch,
    handleFastReasoning,
    handleGeneralReasoning,
    handleAdvancedReasoning,
    handleSelectPrompt
  } = useChatInputHandlers({
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
    setUsedPrompts,
    onPdfFiles: handlePdfFiles,
  });

  // Handler pour ouvrir le file picker Scrivia
  const handleBrowseFiles = React.useCallback(() => {
    handleBrowseFilesFromHook();
    setShowImageSourceModal(false);
    setShowScriviaFilePicker(true);
  }, [handleBrowseFilesFromHook, setShowImageSourceModal]);

  // Ouvrir la modale "Charger un fichier" (ferme le menu comme pour l'image)
  const handleLoadFileClick = React.useCallback(() => {
    closeMenu();
    setShowFileSourceModal(true);
  }, [closeMenu]);

  const handleFileSourceComputer = React.useCallback(() => {
    setShowFileSourceModal(false);
    handleLoadFile();
  }, [handleLoadFile]);

  const handleFileSourceFiles = React.useCallback(() => {
    setShowFileSourceModal(false);
    setShowScriviaFilePicker(true);
  }, []);

  // Handler pour sélectionner des images depuis Scrivia Files
  const handleSelectScriviaImages = React.useCallback(async (selectedImages: Array<{ url: string; fileName?: string }>) => {
    for (const image of selectedImages) {
      await addImageFromUrl(image.url, image.fileName || 'image');
    }
    setShowScriviaFilePicker(false);
  }, [addImageFromUrl]);

  const handlePromptSelection = React.useCallback((prompt: EditorPrompt) => {
    closeMenu();
    const placeholders = parsePromptPlaceholders(prompt.prompt_template);

    if (placeholders.length === 0) {
      handleSelectPrompt(prompt);
      return;
    }

    const existing = usedPrompts.find((item) => item.id === prompt.id)?.placeholderValues;
    setPendingPromptInitialValues(existing);
    setPendingPrompt(prompt);
  }, [closeMenu, handleSelectPrompt, usedPrompts]);

  const handlePromptModalCancel = React.useCallback(() => {
    setPendingPrompt(null);
    setPendingPromptInitialValues(undefined);
  }, []);

  const handlePromptModalConfirm = React.useCallback((values: Record<string, string>) => {
    if (!pendingPrompt) {
      return;
    }
    handleSelectPrompt(pendingPrompt, values);
    setPendingPrompt(null);
    setPendingPromptInitialValues(undefined);
  }, [handleSelectPrompt, pendingPrompt]);
  
  // 🎯 Hook détection commandes
  const { detectCommands } = useInputDetection({
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
    setSlashMenuPosition,
    textareaRef
  });
  
  // 🎯 Hook envoi messages
  const { send } = useChatSend({
    loadNotes,
    getAccessToken,
    onSend,
    setUploadError
  });
  
  // 🎯 Hook actions principales (nouveau)
  const {
    handleInputChange,
    handleSend,
    handleKeyDown,
    handleTranscriptionComplete
  } = useChatActions({
    message,
    images,
    selectedNotes,
    mentions,
    usedPrompts,
    canvasSelections,
    loading,
    disabled,
    textareaRef,
    audioRecorderRef, // ✅ Passer la ref pour raccourci Cmd+Enter
    setMessage,
    setSelectedNotes,
    setMentions,
    setUsedPrompts,
    setCanvasSelections,
    setAudioError,
    detectCommands,
    send,
    clearImages,
    showMentionMenu, // ✅ Bloquer Enter si menu ouvert
    showSlashMenu, // ✅ Bloquer Enter si menu ouvert
    reasoningOverride, // ✅ NOUVEAU : Override reasoning
    vocalMode: isVocalMode
  });

  // 🎯 Hook sélection notes - Mode MENTION (@ dans textarea)
  const { handleSelectNoteWithTextarea: handleSelectNoteForMention } = useNoteSelectionWithTextarea({
    message,
    setMessage,
    mentions,
    setMentions,
    textareaRef,
    closeMenu,
    setNoteSearchQuery,
    mode: 'mention', // ✅ @ dans textarea = mention légère (state séparé)
    onAttach: handleSelectNote,
    onCloseMentionMenu: () => setShowMentionMenu(false) // ✅ Fermer mention menu
  });
  
  // 🎯 Hook sélection notes - Mode ATTACH (bouton @)
  const { handleSelectNoteWithTextarea: handleSelectNoteForAttach } = useNoteSelectionWithTextarea({
    message,
    setMessage,
    mentions,
    setMentions,
    textareaRef,
    closeMenu,
    setNoteSearchQuery,
    mode: 'attach', // ✅ Bouton @ = épinglage complet (selectedNotes[])
    onAttach: handleSelectNote
  });

  // 🎯 Hook auto-resize textarea
  useTextareaAutoResize({ message, textareaRef });
  
  // 🎯 Raccourcis clavier globaux (Espace, /, @, Cmd+Enter, Esc)
  useGlobalChatShortcuts({
    textareaRef,
    audioRecorderRef,
    onOpenSlashMenu: () => openMenu('slash'),
    onOpenNoteSelector: () => openMenu('notes'),
    onCloseAllMenus: closeMenu,
    onValueChange: (value, cursorPosition) => {
      setMessage(value);
      detectCommands(value, cursorPosition);
    },
    enabled: true
  });

  // ✅ Écouter les sélections du canvas
  useEffect(() => {
    const handleCanvasSelection = (event: Event) => {
      try {
        // ✅ Type guard pour valider que c'est un CustomEvent avec detail
        if (!(event instanceof CustomEvent)) {
          logger.warn(LogCategory.EDITOR, '[ChatInput] Événement canvas-selection invalide (pas un CustomEvent)', {
            eventType: event.type
          });
          return;
        }

        const customEvent = event as CustomEvent<import('@/types/canvasSelection').CanvasSelection>;
        
        // ✅ Validation que detail existe et contient les propriétés attendues
        if (!customEvent.detail || typeof customEvent.detail !== 'object') {
          logger.warn(LogCategory.EDITOR, '[ChatInput] Événement canvas-selection invalide (detail manquant)', {
            hasDetail: !!customEvent.detail
          });
          return;
        }

        const selection = customEvent.detail;
        
        // ✅ Validation stricte avec fonction centralisée
        if (!selection.text || !isValidCanvasSelection(selection.text)) {
          return;
        }
        
        // Ajouter la sélection au state (éviter les doublons)
        setCanvasSelections(prev => {
          // Vérifier si une sélection identique existe déjà (même texte et même note)
          const exists = prev.some(s => 
            s.text.trim() === selection.text.trim() && 
            s.noteId === selection.noteId
          );
          if (exists) return prev;
          
          // ✅ Remplacer la dernière sélection de la même note si elle existe
          // (une seule sélection active par note à la fois)
          const filtered = prev.filter(s => s.noteId !== selection.noteId);
          
          return [...filtered, selection];
        });
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[ChatInput] ❌ Erreur lors du traitement de canvas-selection', {
          error: error instanceof Error ? error.message : String(error),
          eventType: event.type
        });
      }
    };

    document.addEventListener('canvas-selection', handleCanvasSelection as EventListener);
    
    return () => {
      document.removeEventListener('canvas-selection', handleCanvasSelection as EventListener);
    };
  }, [setCanvasSelections]);

  // 🎯 Fermer les menus au clic extérieur
  useMultipleMenusClickOutside([
    { isOpen: showFileMenu, menuClass: 'chat-file-menu', triggerClass: 'chatgpt-input-file', onClose: closeMenu },
    { isOpen: showWebSearchMenu, menuClass: 'chat-websearch-menu', triggerClass: 'chatgpt-input-websearch', onClose: closeMenu },
    { isOpen: showReasoningMenu, menuClass: 'chat-reasoning-menu', triggerClass: 'chatgpt-input-reasoning', onClose: closeMenu },
    { isOpen: showNoteSelector, menuClass: 'chat-note-selector', triggerClass: 'chatgpt-input-mention', onClose: closeMenu, additionalCleanup: () => setNoteSearchQuery('') },
    { isOpen: showSlashMenu, menuClass: 'chat-slash-menu', triggerClass: 'chatgpt-input-textarea', onClose: closeMenu, additionalCleanup: () => setSlashQuery('') }
  ]);

  // ✅ FIX: Charger les notes récentes à l'ouverture des menus @ (pas au montage)
  // Résout le bug : au premier chargement, le token n'est pas dispo → recentNotes vide
  // 🔧 AMÉLIORATION : Charger à CHAQUE ouverture (pas seulement si vide)
  // Car le premier appel peut échouer silencieusement (token pas prêt)
  useEffect(() => {
    // Charger si menu épingler OU menu mention s'ouvre
    if (showNoteSelector || showMentionMenu) {
      loadRecentNotes();
    }
  }, [showNoteSelector, showMentionMenu, loadRecentNotes]);

  // Sur mobile/tactile, on neutralise toute restauration de focus au montage
  // pour éviter l'ouverture automatique du clavier à l'arrivée sur le chat.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const isMobileLike = window.matchMedia('(pointer: coarse), (max-width: 1024px)').matches;
    if (!isMobileLike) {
      return;
    }

    const blurTextareaIfNeeded = () => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      if (document.activeElement === textarea) {
        textarea.blur();
      }
    };

    blurTextareaIfNeeded();
    const immediateTimeout = window.setTimeout(blurTextareaIfNeeded, 0);
    const delayedTimeout = window.setTimeout(blurTextareaIfNeeded, 180);

    return () => {
      window.clearTimeout(immediateTimeout);
      window.clearTimeout(delayedTimeout);
    };
  }, [textareaRef]);

  return (
    <div 
      className={`chatgpt-input-area ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ChatInputContent
        message={message} onChange={handleInputChange} onKeyDown={handleKeyDown}
        placeholder={placeholder} textareaRef={textareaRef}
        audioError={audioError} uploadError={uploadError || pdfError}
        onClearErrors={() => { setAudioError(null); setUploadError(null); clearPdfError(); }}
        images={images} onRemoveImage={removeImage}
        selectedNotes={selectedNotes} onRemoveNote={handleRemoveNote}
        mentions={mentions} onRemoveMention={(id) => setMentions(mentions.filter(m => m.id !== id))}
        usedPrompts={usedPrompts}
        canvasSelections={canvasSelections} onRemoveCanvasSelection={(id) => setCanvasSelections(canvasSelections.filter(s => s.id !== id))}
        editingMessageId={editingMessageId} onCancelEdit={onCancelEdit}
        isDragging={isDragging} onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
        cameraInputRef={cameraInputRef} onCameraCapture={handleCameraCapture}
      >
        <SlashMenu 
          show={showSlashMenu}
          filteredPrompts={filteredChatPrompts} 
          onSelectPrompt={handlePromptSelection}
          onClose={closeMenu}
          position={slashMenuPosition}
        />
        <MentionMenu
          show={showMentionMenu}
          searchQuery={mentionSearchQuery}
          recentNotes={recentNotes}
          searchedNotes={searchedNotes}
          isSearching={isSearching}
          position={mentionMenuPosition}
          onSelectNote={handleSelectNoteForMention}
          onClose={() => setShowMentionMenu(false)}
        />
      </ChatInputContent>

      <ChatInputToolbar
        showNoteSelector={showNoteSelector} selectedNotes={selectedNotes} noteSearchQuery={noteSearchQuery}
        recentNotes={recentNotes} searchedNotes={searchedNotes} isSearching={isSearching}
        atMenuPosition={atMenuPosition} onToggleNoteSelector={() => toggleMenu('notes')}
        onSelectNote={handleSelectNoteForAttach}
        onRemoveNote={handleRemoveNote}
        onNoteSearchQueryChange={setNoteSearchQuery}
        showFileMenu={showFileMenu} showImageSourceModal={showImageSourceModal}
        showFileSourceModal={showFileSourceModal}
        imagesCount={images.length} onToggleFileMenu={() => toggleMenu('file')}
        onLoadImageClick={handleLoadImageClick} onLoadFileClick={handleLoadFileClick}
        onTakePhoto={handleTakePhoto} onCloseImageModal={() => setShowImageSourceModal(false)}
        onCloseFileModal={() => setShowFileSourceModal(false)}
        onBrowseComputer={handleBrowseComputer} onBrowseFiles={handleBrowseFiles}
        onFileSelectComputer={handleFileSourceComputer} onFileSelectFiles={handleFileSourceFiles}
        showWebSearchMenu={showWebSearchMenu} onToggleWebSearchMenu={() => toggleMenu('websearch')}
        onNewsSearch={handleNewsSearch} onBasicSearch={handleBasicSearch} onAdvancedSearch={handleAdvancedSearch}
        showReasoningMenu={showReasoningMenu} reasoningOverride={reasoningOverride}
        defaultReasoningLevel={defaultReasoningLevel} onToggleReasoningMenu={() => toggleMenu('reasoning')}
        onFastReasoning={handleFastReasoning} onGeneralReasoning={handleGeneralReasoning}
        onAdvancedReasoning={handleAdvancedReasoning}
        onTranscriptionComplete={handleTranscriptionComplete} onAudioError={setAudioError}
        audioRecorderRef={audioRecorderRef}
        isVocalMode={isVocalMode}
        onToggleVocalMode={onToggleVocalMode}
        onSend={handleSend} onStopGeneration={onStopGeneration}
        canSend={(!!message.trim() || images.length > 0) && (images.length === 0 || images.every(img => isImageUrlUploaded(img.base64)))}
        disabled={disabled || isParsingPdf} loading={loading || isParsingPdf}
        isParsingPdf={isParsingPdf}
        imagesUploading={images.length > 0 && images.some(img => !isImageUrlUploaded(img.base64))}
      />

      <PromptArgumentsModal
        prompt={pendingPrompt}
        initialValues={pendingPromptInitialValues}
        onCancel={handlePromptModalCancel}
        onConfirm={handlePromptModalConfirm}
      />

      <ScriviaFilePicker
        isOpen={showScriviaFilePicker}
        onClose={() => setShowScriviaFilePicker(false)}
        onSelectImages={handleSelectScriviaImages}
        multiple={true}
      />
    </div>
  );
};

export default ChatInput; 

