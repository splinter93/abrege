'use client';

import React, { useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useNoteSearch } from '@/hooks/useNoteSearch';
import { supabase } from '@/supabaseClient';

/**
 * EditorSidebarSearchBar - Barre de recherche pour la sidebar éditeur
 * 
 * Features:
 * - Recherche notes avec debounce 300ms
 * - Affiche résultats ou notes récentes
 * - Loading state pendant recherche
 * - Click sur résultat → onNoteSelect
 * 
 * API:
 * - GET /api/v2/search?q=...&type=notes&limit=10
 * - GET /api/v2/note/recent?limit=10
 * 
 * @module components/editor/EditorSidebarSearchBar
 */

interface EditorSidebarSearchBarProps {
  /** Callback pour sélectionner une note */
  onNoteSelect: (noteId: string) => void;
}

export default function EditorSidebarSearchBar({ onNoteSelect }: EditorSidebarSearchBarProps) {
  
  // ✅ FIX: Mémoriser getAccessToken pour éviter re-renders infinis
  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);
  
  // ✅ Hook useNoteSearch (déjà existant)
  const {
    noteSearchQuery,
    setNoteSearchQuery,
    searchedNotes,
    isSearching
  } = useNoteSearch({ getAccessToken });

  // Handler sélection note
  const handleNoteClick = useCallback((noteId: string) => {
    onNoteSelect(noteId);
    setNoteSearchQuery(''); // Clear search après sélection
  }, [onNoteSelect, setNoteSearchQuery]);

  return (
    <>
      {/* Input avec style sidebar */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search className="editor-sidebar-search-icon-clean" size={16} />
        <input
          type="text"
          className="editor-sidebar-search-input-clean"
          placeholder="Rechercher une note..."
          value={noteSearchQuery}
          onChange={(e) => setNoteSearchQuery(e.target.value)}
          autoComplete="off"
        />
        {isSearching && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}
      </div>

      {/* Résultats (affichés en overlay absolu) */}
      {/* Afficher seulement si recherche active (>= 2 caractères) */}
      {noteSearchQuery.length >= 2 && (
        <div 
          className="editor-sidebar-search-results-container"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            maxHeight: '400px',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            marginTop: '1px'
          }}
        >
          {!isSearching && searchedNotes.length === 0 && (
            <div className="editor-sidebar-search-empty" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Aucun résultat
            </div>
          )}

          {searchedNotes.length > 0 && (
            <div className="editor-sidebar-search-results">
              {searchedNotes.slice(0, 8).map((note) => (
                <div
                  key={note.id}
                  className="editor-sidebar-search-result"
                  onClick={() => handleNoteClick(note.id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="editor-sidebar-search-result-title" style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: 'var(--text-primary)',
                    marginBottom: note.description ? '4px' : '0'
                  }}>
                    {note.title}
                  </div>
                  {note.description && (
                    <div className="editor-sidebar-search-result-desc" style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-tertiary)',
                      lineHeight: '1.4',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {note.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

