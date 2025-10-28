/**
 * Composant de sélection de notes pour le chat
 * Permet de rechercher et attacher des notes au contexte
 * @module components/chat/NoteSelector
 */

'use client';
import React from 'react';
import { Search, Feather } from 'react-feather';
import type { SelectedNote } from '@/hooks/useNotesLoader';

interface NoteSelectorProps {
  // État
  showNoteSelector: boolean;
  selectedNotes: SelectedNote[];
  noteSearchQuery: string;
  recentNotes: SelectedNote[];
  searchedNotes: SelectedNote[];
  isSearching: boolean;
  atMenuPosition: { top: number; left: number } | null;
  
  // Actions
  onToggle: () => void;
  onSelectNote: (note: SelectedNote) => void;
  onRemoveNote: (noteId: string) => void;
  onSearchQueryChange: (query: string) => void;
  
  // UI state
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Composant NoteSelector
 * Affiche un menu de sélection de notes avec recherche
 */
const NoteSelector: React.FC<NoteSelectorProps> = ({
  showNoteSelector,
  selectedNotes,
  noteSearchQuery,
  recentNotes,
  searchedNotes,
  isSearching,
  atMenuPosition,
  onToggle,
  onSelectNote,
  onRemoveNote,
  onSearchQueryChange,
  disabled = false,
  loading = false
}) => {
  return (
    <>
      {/* Bouton @ (Mention/Context) */}
      <div style={{ position: 'relative' }}>
        <button 
          className={`chatgpt-input-mention ${showNoteSelector ? 'active' : ''} ${selectedNotes.length > 0 ? 'has-notes' : ''}`}
          aria-label="Mentionner une note"
          onClick={onToggle}
          disabled={disabled || loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path>
          </svg>
          {selectedNotes.length > 0 && (
            <span className="chatgpt-input-mention-badge">{selectedNotes.length}</span>
          )}
        </button>

        {/* Note Selector Menu */}
        {showNoteSelector && (
          <div 
            className="chat-note-selector"
            style={atMenuPosition ? {
              left: `${atMenuPosition.left}px`
            } : undefined}
          >
            <div className="chat-note-search-container">
              <Search size={16} className="chat-note-search-icon" />
              <input
                type="text"
                className="chat-note-search-input"
                placeholder="Rechercher une note..."
                value={noteSearchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                autoFocus={'ontouchstart' in window || navigator.maxTouchPoints > 0 ? false : true}
              />
            </div>

            <div className="chat-note-list-header">
              {isSearching ? 'Recherche...' : (noteSearchQuery ? 'Résultats' : 'Récentes')}
            </div>
            <div className="chat-note-list">
              {isSearching ? (
                <div className="chat-note-list-loading">
                  <div className="chat-note-loading-spinner"></div>
                  <div className="chat-note-loading-text">Recherche en cours...</div>
                </div>
              ) : (
                <>
                  {(noteSearchQuery && noteSearchQuery.length >= 2 ? searchedNotes : recentNotes).map((note) => (
                    <button
                      key={note.id}
                      className={`chat-note-item ${selectedNotes.find(n => n.id === note.id) ? 'selected' : ''}`}
                      onClick={() => onSelectNote(note)}
                    >
                      <div className="chat-note-item-content">
                        <div className="chat-note-item-title">{note.title}</div>
                      </div>
                      {selectedNotes.find(n => n.id === note.id) && (
                        <span className="checkmark">✓</span>
                      )}
                    </button>
                  ))}
                  {noteSearchQuery && noteSearchQuery.length >= 2 && searchedNotes.length === 0 && (
                    <div className="chat-note-list-empty">Aucune note trouvée</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Mémoisation avec comparaison custom pour optimiser performance
export default React.memo(NoteSelector, (prev, next) => {
  return (
    prev.showNoteSelector === next.showNoteSelector &&
    prev.noteSearchQuery === next.noteSearchQuery &&
    prev.selectedNotes.length === next.selectedNotes.length &&
    prev.isSearching === next.isSearching &&
    prev.disabled === next.disabled &&
    prev.loading === next.loading
  );
});

