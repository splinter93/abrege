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
    recentNotes,
    isSearching,
    loadRecentNotes
  } = useNoteSearch({ getAccessToken });

  // ✅ FIX FINAL: Ne JAMAIS charger automatiquement
  // Charger uniquement au premier focus de l'input
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false);
  
  const handleInputFocus = useCallback(() => {
    if (!hasLoadedOnce) {
      loadRecentNotes();
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, loadRecentNotes]);

  // Handler sélection note
  const handleNoteClick = useCallback((noteId: string) => {
    onNoteSelect(noteId);
    setNoteSearchQuery(''); // Clear search après sélection
  }, [onNoteSelect, setNoteSearchQuery]);

  // Résultats à afficher (searched OU recent)
  const displayedNotes = noteSearchQuery.length >= 2 ? searchedNotes : recentNotes;

  return (
    <div className="editor-sidebar-search">
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="editor-sidebar-search-input"
          placeholder="Rechercher une note..."
          value={noteSearchQuery}
          onChange={(e) => setNoteSearchQuery(e.target.value)}
          onFocus={handleInputFocus}
          autoComplete="off"
        />
        {isSearching && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}
      </div>

      {/* Résultats */}
      {noteSearchQuery.length >= 2 && !isSearching && searchedNotes.length === 0 && (
        <div className="editor-sidebar-search-empty">
          Aucun résultat
        </div>
      )}

      {displayedNotes.length > 0 && (
        <div className="editor-sidebar-search-results">
          {displayedNotes.slice(0, 8).map((note) => (
            <div
              key={note.id}
              className="editor-sidebar-search-result"
              onClick={() => handleNoteClick(note.id)}
            >
              <div className="editor-sidebar-search-result-title">
                {note.title}
              </div>
              {note.description && (
                <div className="editor-sidebar-search-result-desc">
                  {note.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

