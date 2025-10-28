/**
 * Input principal du chat - Version optimisée < 300 lignes
 * Composant léger qui délègue le rendu aux sous-composants
 * @module components/chat/ChatInput
 */

'use client';
import React from 'react';
import type { ImageAttachment, MessageContent } from '@/types/image';
import { useAuth } from '@/hooks/useAuth';
import { useEditorPrompts } from '@/hooks/useEditorPrompts';
import { useMenus } from '@/hooks/useMenus';
import { useNotesLoader, type SelectedNote, type NoteWithContent } from '@/hooks/useNotesLoader';
import { useNoteSearch } from '@/hooks/useNoteSearch';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useChatInputHandlers } from '@/hooks/useChatInputHandlers';
import { useMultipleMenusClickOutside } from '@/hooks/useMenuClickOutside';
import { useInputDetection } from '@/hooks/useInputDetection';
import { useChatSend } from '@/hooks/useChatSend';
import { useNoteSelectionWithTextarea } from '@/hooks/useNoteSelectionWithTextarea';
import { useTextareaAutoResize } from '@/hooks/useTextareaAutoResize';
import { useChatPrompts } from '@/hooks/useChatPrompts';
import { useChatState } from '@/hooks/useChatState';
import { useChatActions } from '@/hooks/useChatActions';
import ChatInputContent from './ChatInputContent';
import ChatInputToolbar from './ChatInputToolbar';
import SlashMenu from './SlashMenu';

interface ChatInputProps {
  onSend: (message: string | MessageContent, images?: ImageAttachment[], notes?: NoteWithContent[]) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
  sessionId: string;
  currentAgentModel?: string;
  editingMessageId?: string | null;
  editingContent?: string;
  onCancelEdit?: () => void;
}

// Helper: mapper modèle → niveau reasoning
const getReasoningLevelFromModel = (model?: string): 'advanced' | 'general' | 'fast' | null => {
  if (!model) return null;
  if (model.includes('grok-4-0709')) return 'advanced';
  if (model.includes('grok-4-fast-reasoning')) return 'general';
  if (model.includes('grok-4-fast-non-reasoning')) return 'fast';
  return null;
};

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  loading, 
  textareaRef, 
  disabled = false, 
  placeholder = "Commencez à discuter...", 
  sessionId, 
  currentAgentModel,
  editingMessageId,
  editingContent,
  onCancelEdit
}) => {
  // 🎯 Hooks auth & prompts
  const { getAccessToken, user } = useAuth();
  const { prompts: allPrompts } = useEditorPrompts(user?.id);
  const { loadNotes } = useNotesLoader();
  
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
    handleRemoveNote
  } = useNoteSearch({ getAccessToken });
  
  // 🎯 Hook upload images
  const {
    images,
    uploadError,
    setUploadError,
    isDragging,
    cameraInputRef,
    processAndUploadImage,
    removeImage,
    clearImages,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleCameraCapture,
    openCamera
  } = useImageUpload({ sessionId });
  
  // 🎯 Hook état local (nouveau)
  const {
    message,
    setMessage,
    audioError,
    setAudioError,
    showImageSourceModal,
    setShowImageSourceModal,
    reasoningOverride,
    setReasoningOverride,
    slashQuery,
    setSlashQuery,
    atMenuPosition,
    setAtMenuPosition
  } = useChatState({ editingContent, textareaRef });
  
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
    handleBrowseFiles,
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
    processAndUploadImage
  });
  
  // 🎯 Hook détection commandes
  const { detectCommands } = useInputDetection({
    showNoteSelector,
    showSlashMenu,
    openMenu,
    closeMenu,
    setSlashQuery,
    setNoteSearchQuery,
    setAtMenuPosition,
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
    loading,
    disabled,
    textareaRef,
    setMessage,
    setSelectedNotes,
    setAudioError,
    detectCommands,
    send,
    clearImages
  });

  // 🎯 Hook sélection notes avec textarea
  const { handleSelectNoteWithTextarea } = useNoteSelectionWithTextarea({
    handleSelectNote,
    message,
    setMessage,
    textareaRef,
    closeMenu,
    setNoteSearchQuery
  });

  // 🎯 Hook auto-resize textarea
  useTextareaAutoResize({ message, textareaRef });

  // 🎯 Fermer les menus au clic extérieur
  useMultipleMenusClickOutside([
    { isOpen: showFileMenu, menuClass: 'chat-file-menu', triggerClass: 'chatgpt-input-file', onClose: closeMenu },
    { isOpen: showWebSearchMenu, menuClass: 'chat-websearch-menu', triggerClass: 'chatgpt-input-websearch', onClose: closeMenu },
    { isOpen: showReasoningMenu, menuClass: 'chat-reasoning-menu', triggerClass: 'chatgpt-input-reasoning', onClose: closeMenu },
    { isOpen: showNoteSelector, menuClass: 'chat-note-selector', triggerClass: 'chatgpt-input-mention', onClose: closeMenu, additionalCleanup: () => setNoteSearchQuery('') },
    { isOpen: showSlashMenu, menuClass: 'chat-slash-menu', triggerClass: 'chatgpt-input-textarea', onClose: closeMenu, additionalCleanup: () => setSlashQuery('') }
  ]);

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
        audioError={audioError} uploadError={uploadError}
        onClearErrors={() => { setAudioError(null); setUploadError(null); }}
        images={images} onRemoveImage={removeImage}
        selectedNotes={selectedNotes} onRemoveNote={handleRemoveNote}
        editingMessageId={editingMessageId} onCancelEdit={onCancelEdit}
        isDragging={isDragging} onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
        cameraInputRef={cameraInputRef} onCameraCapture={handleCameraCapture}
      >
        <SlashMenu showSlashMenu={showSlashMenu} filteredPrompts={filteredChatPrompts} onSelectPrompt={handleSelectPrompt} />
      </ChatInputContent>

      <ChatInputToolbar
        showNoteSelector={showNoteSelector} selectedNotes={selectedNotes} noteSearchQuery={noteSearchQuery}
        recentNotes={recentNotes} searchedNotes={searchedNotes} isSearching={isSearching}
        atMenuPosition={atMenuPosition} onToggleNoteSelector={() => toggleMenu('notes')}
        onSelectNote={handleSelectNoteWithTextarea} onRemoveNote={handleRemoveNote}
        onNoteSearchQueryChange={setNoteSearchQuery}
        showFileMenu={showFileMenu} showImageSourceModal={showImageSourceModal}
        imagesCount={images.length} onToggleFileMenu={() => toggleMenu('file')}
        onLoadImageClick={handleLoadImageClick} onLoadFile={handleLoadFile}
        onTakePhoto={handleTakePhoto} onCloseImageModal={() => setShowImageSourceModal(false)}
        onBrowseComputer={handleBrowseComputer} onBrowseFiles={handleBrowseFiles}
        showWebSearchMenu={showWebSearchMenu} onToggleWebSearchMenu={() => toggleMenu('websearch')}
        onNewsSearch={handleNewsSearch} onBasicSearch={handleBasicSearch} onAdvancedSearch={handleAdvancedSearch}
        showReasoningMenu={showReasoningMenu} reasoningOverride={reasoningOverride}
        defaultReasoningLevel={defaultReasoningLevel} onToggleReasoningMenu={() => toggleMenu('reasoning')}
        onFastReasoning={handleFastReasoning} onGeneralReasoning={handleGeneralReasoning}
        onAdvancedReasoning={handleAdvancedReasoning}
        onTranscriptionComplete={handleTranscriptionComplete} onAudioError={setAudioError}
        onSend={handleSend} canSend={!!message.trim() || images.length > 0}
        disabled={disabled} loading={loading}
      />
    </div>
  );
};

export default ChatInput; 

