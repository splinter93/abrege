/**
 * Barre d'outils du chat input
 * Contient tous les boutons d'action (WebSearch, Reasoning, Audio, Send)
 * @module components/chat/ChatInputToolbar
 */

'use client';
import React, { useState } from 'react';
import { Globe, CornerUpRight, Search, FileText, Zap, Target, Cpu } from 'react-feather';
import { Lightbulb, Loader } from 'lucide-react';
import AudioRecorder, { type AudioRecorderRef } from './AudioRecorder';
import NoteSelector from './NoteSelector';
import FileMenu from './FileMenu';
import type { SelectedNote } from '@/hooks/useNotesLoader';

interface ChatInputToolbarProps {
  // Note Selector props
  showNoteSelector: boolean;
  selectedNotes: SelectedNote[];
  noteSearchQuery: string;
  recentNotes: SelectedNote[];
  searchedNotes: SelectedNote[];
  isSearching: boolean;
  atMenuPosition: { top: number; left: number } | null;
  onToggleNoteSelector: () => void;
  onSelectNote: (note: SelectedNote) => void;
  onRemoveNote: (noteId: string) => void;
  onNoteSearchQueryChange: (query: string) => void;
  
  // File Menu props
  showFileMenu: boolean;
  showImageSourceModal: boolean;
  imagesCount: number;
  onToggleFileMenu: () => void;
  onLoadImageClick: () => void;
  onLoadFile: () => void;
  onTakePhoto: () => void;
  onCloseImageModal: () => void;
  onBrowseComputer: () => void;
  onBrowseFiles: () => void;
  
  // WebSearch props
  showWebSearchMenu: boolean;
  onToggleWebSearchMenu: () => void;
  onNewsSearch: () => void;
  onBasicSearch: () => void;
  onAdvancedSearch: () => void;
  
  // Reasoning props
  showReasoningMenu: boolean;
  reasoningOverride: 'advanced' | 'general' | 'fast' | null;
  defaultReasoningLevel: 'advanced' | 'general' | 'fast' | null;
  onToggleReasoningMenu: () => void;
  onFastReasoning: () => void;
  onGeneralReasoning: () => void;
  onAdvancedReasoning: () => void;
  
  // Audio props
  onTranscriptionComplete: (text: string) => void;
  onAudioError: (error: string) => void;
  audioRecorderRef?: React.RefObject<AudioRecorderRef | null>; // ✅ Ref pour raccourci clavier
  
  // Send props
  onSend: () => void;
  canSend: boolean;
  
  // UI state
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Composant ChatInputToolbar
 * Barre d'outils avec tous les boutons d'action du chat
 */
const ChatInputToolbar: React.FC<ChatInputToolbarProps> = ({
  // Note Selector
  showNoteSelector,
  selectedNotes,
  noteSearchQuery,
  recentNotes,
  searchedNotes,
  isSearching,
  atMenuPosition,
  onToggleNoteSelector,
  onSelectNote,
  onRemoveNote,
  onNoteSearchQueryChange,
  
  // File Menu
  showFileMenu,
  showImageSourceModal,
  imagesCount,
  onToggleFileMenu,
  onLoadImageClick,
  onLoadFile,
  onTakePhoto,
  onCloseImageModal,
  onBrowseComputer,
  onBrowseFiles,
  
  // WebSearch
  showWebSearchMenu,
  onToggleWebSearchMenu,
  onNewsSearch,
  onBasicSearch,
  onAdvancedSearch,
  
  // Reasoning
  showReasoningMenu,
  reasoningOverride,
  defaultReasoningLevel,
  onToggleReasoningMenu,
  onFastReasoning,
  onGeneralReasoning,
  onAdvancedReasoning,
  
  // Audio
  onTranscriptionComplete,
  onAudioError,
  audioRecorderRef,
  
  // Send
  onSend,
  canSend,
  
  // UI state
  disabled = false,
  loading = false
}) => {
  // ✅ État local pour tracking de l'enregistrement audio
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="chatgpt-input-actions">
      {/* Bouton @ (Notes) */}
      <NoteSelector
        showNoteSelector={showNoteSelector}
        selectedNotes={selectedNotes}
        noteSearchQuery={noteSearchQuery}
        recentNotes={recentNotes}
        searchedNotes={searchedNotes}
        isSearching={isSearching}
        atMenuPosition={atMenuPosition}
        onToggle={onToggleNoteSelector}
        onSelectNote={onSelectNote}
        onRemoveNote={onRemoveNote}
        onSearchQueryChange={onNoteSearchQueryChange}
        disabled={disabled}
        loading={loading}
      />

      {/* Bouton Fichier */}
      <FileMenu
        showFileMenu={showFileMenu}
        showImageSourceModal={showImageSourceModal}
        imagesCount={imagesCount}
        onToggle={onToggleFileMenu}
        onLoadImageClick={onLoadImageClick}
        onLoadFile={onLoadFile}
        onTakePhoto={onTakePhoto}
        onCloseImageModal={onCloseImageModal}
        onBrowseComputer={onBrowseComputer}
        onBrowseFiles={onBrowseFiles}
        disabled={disabled}
        loading={loading}
      />

      {/* WebSearch avec menu contextuel */}
      <div style={{ position: 'relative' }}>
        <button 
          className={`chatgpt-input-websearch ${showWebSearchMenu ? 'active' : ''}`}
          aria-label="Recherche web"
          onClick={onToggleWebSearchMenu}
          disabled={disabled || loading}
        >
          <Globe size={18} />
        </button>

        {/* Menu contextuel WebSearch */}
        {showWebSearchMenu && (
          <div className="chat-websearch-menu">
            <div className="chat-menu-header">Search</div>
            <button className="chat-websearch-menu-item" onClick={onNewsSearch}>
              <FileText size={16} />
              <span>News</span>
            </button>
            <button className="chat-websearch-menu-item" onClick={onBasicSearch}>
              <Globe size={16} />
              <span>Websearch</span>
            </button>
            <button className="chat-websearch-menu-item" onClick={onAdvancedSearch}>
              <Search size={16} />
              <span>Deep Search</span>
            </button>
          </div>
        )}
      </div>

      {/* Reasoning avec menu contextuel */}
      <div style={{ position: 'relative' }}>
        <button 
          className={`chatgpt-input-reasoning ${showReasoningMenu ? 'active' : ''} ${reasoningOverride ? 'override-active' : ''}`}
          aria-label="Reasoning"
          onClick={onToggleReasoningMenu}
          disabled={disabled || loading}
          title={reasoningOverride ? `Override actif: ${reasoningOverride}` : 'Reasoning mode'}
        >
          <Lightbulb size={18} />
        </button>

        {/* Menu contextuel Reasoning */}
        {showReasoningMenu && (
          <div className="chat-reasoning-menu">
            <div className="chat-menu-header">Reasoning</div>
            <button 
              className={`chat-reasoning-menu-item ${(reasoningOverride === 'advanced' || (!reasoningOverride && defaultReasoningLevel === 'advanced')) ? 'selected' : ''}`}
              onClick={onAdvancedReasoning}
              title="grok-4-0709 (Puissant, coûteux)"
            >
              <Cpu size={16} />
              <span>Advanced {defaultReasoningLevel === 'advanced' && '(Default)'}</span>
              {(reasoningOverride === 'advanced' || (!reasoningOverride && defaultReasoningLevel === 'advanced')) && <span className="checkmark">✓</span>}
            </button>
            <button 
              className={`chat-reasoning-menu-item ${(reasoningOverride === 'general' || (!reasoningOverride && defaultReasoningLevel === 'general')) ? 'selected' : ''}`}
              onClick={onGeneralReasoning}
              title="grok-4-1-fast-reasoning (Équilibré)"
            >
              <Target size={16} />
              <span>General {defaultReasoningLevel === 'general' && '(Default)'}</span>
              {(reasoningOverride === 'general' || (!reasoningOverride && defaultReasoningLevel === 'general')) && <span className="checkmark">✓</span>}
            </button>
            <button 
              className={`chat-reasoning-menu-item ${(reasoningOverride === 'fast' || (!reasoningOverride && defaultReasoningLevel === 'fast')) ? 'selected' : ''}`}
              onClick={onFastReasoning}
              title="grok-4-1-fast-non-reasoning (Rapide)"
            >
              <Zap size={16} />
              <span>Fast {defaultReasoningLevel === 'fast' && '(Default)'}</span>
              {(reasoningOverride === 'fast' || (!reasoningOverride && defaultReasoningLevel === 'fast')) && <span className="checkmark">✓</span>}
            </button>
          </div>
        )}
      </div>
      
      <div style={{ flex: 1 }}></div>
      
      <AudioRecorder 
        ref={audioRecorderRef}
        onTranscriptionComplete={onTranscriptionComplete}
        onError={onAudioError}
        onRecordingStateChange={setIsRecording}
        disabled={disabled}
      />
      
      <button 
        onClick={onSend} 
        disabled={!canSend || loading || disabled || isRecording}
        className={`chatgpt-input-send ${loading ? 'loading' : ''}`}
        aria-label="Envoyer le message"
        title={isRecording ? 'Enregistrement en cours...' : 'Envoyer le message'}
      >
        {loading ? (
          <Loader size={20} className="animate-spin" />
        ) : (
          <CornerUpRight size={20} />
        )}
      </button>
    </div>
  );
};

export default ChatInputToolbar;

