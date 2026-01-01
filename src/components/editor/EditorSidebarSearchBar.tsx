'use client';

import React, { useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useNoteSearch } from '@/hooks/useNoteSearch';
import { useFilesPage } from '@/hooks/useFilesPage';
import { supabase } from '@/supabaseClient';
import type { FileItem } from '@/types/files';

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
  /** Onglet actif : 'classeurs' pour recherche notes, 'fichiers' pour recherche fichiers */
  activeTab?: 'classeurs' | 'fichiers';
}

export default function EditorSidebarSearchBar({ onNoteSelect, activeTab = 'classeurs' }: EditorSidebarSearchBarProps) {
  
  // ✅ FIX: Mémoriser getAccessToken pour éviter re-renders infinis
  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);
  
  // ✅ Hook useNoteSearch pour l'onglet "classeurs"
  const {
    noteSearchQuery: noteQuery,
    setNoteSearchQuery: setNoteQuery,
    searchedNotes,
    isSearching: isSearchingNotes
  } = useNoteSearch({ getAccessToken });

  // ✅ Hook useFilesPage pour l'onglet "fichiers"
  const {
    searchTerm: fileSearchQuery,
    setSearchTerm: setFileSearchQuery,
    filteredFiles,
    loading: isSearchingFiles,
    fetchFiles
  } = useFilesPage();

  // Charger les fichiers au montage si on est sur l'onglet fichiers
  React.useEffect(() => {
    if (activeTab === 'fichiers') {
      fetchFiles();
    }
  }, [activeTab, fetchFiles]);

  // Variables selon l'onglet actif
  const searchQuery = activeTab === 'fichiers' ? fileSearchQuery : noteQuery;
  const setSearchQuery = activeTab === 'fichiers' ? setFileSearchQuery : setNoteQuery;
  const isSearching = activeTab === 'fichiers' ? isSearchingFiles : isSearchingNotes;
  const hasResults = activeTab === 'fichiers' 
    ? (filteredFiles && filteredFiles.length > 0)
    : (searchedNotes.length > 0);

  // Handler sélection note
  const handleNoteClick = useCallback((noteId: string) => {
    onNoteSelect(noteId);
    setNoteQuery(''); // Clear search après sélection
  }, [onNoteSelect, setNoteQuery]);

  // Handler sélection fichier
  const handleFileClick = useCallback((file: FileItem) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
    setFileSearchQuery(''); // Clear search après sélection
  }, [setFileSearchQuery]);

  return (
    <>
      {/* Input avec style sidebar */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search className="editor-sidebar-search-icon-clean" size={16} />
        <input
          type="text"
          className="editor-sidebar-search-input-clean"
          placeholder={activeTab === 'fichiers' ? 'Rechercher un fichier...' : 'Rechercher une note...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
      {searchQuery.length >= 2 && (
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
          {!isSearching && !hasResults && (
            <div className="editor-sidebar-search-empty" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Aucun résultat
            </div>
          )}

          {/* Résultats notes (onglet classeurs) */}
          {activeTab === 'classeurs' && searchedNotes.length > 0 && (
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

          {/* Résultats fichiers (onglet fichiers) */}
          {activeTab === 'fichiers' && filteredFiles && filteredFiles.length > 0 && (
            <div className="editor-sidebar-search-results">
              {filteredFiles.slice(0, 8).map((file) => (
                <div
                  key={file.id}
                  className="editor-sidebar-search-result"
                  onClick={() => handleFileClick(file)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background-color 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ 
                    width: '40px',
                    height: '40px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    position: 'relative'
                  }}>
                    {(() => {
                      const isImage = file.mime_type?.startsWith('image/');
                      const hasUrl = Boolean(file.url);
                      
                      if (isImage && hasUrl) {
                        return (
                          <img
                            src={file.url}
                            alt={file.filename || 'Image'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              display: 'block'
                            }}
                            onError={(e) => {
                              // Fallback sur icône si l'image ne charge pas
                              const target = e.currentTarget;
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<span style="font-size: 20px;">🖼️</span>';
                              }
                            }}
                            loading="lazy"
                            crossOrigin="anonymous"
                          />
                        );
                      }
                      
                      // Fallback sur icônes pour les autres types
                      if (file.mime_type?.startsWith('video/')) {
                        return <span style={{ fontSize: '20px' }}>🎥</span>;
                      }
                      if (file.mime_type?.startsWith('audio/')) {
                        return <span style={{ fontSize: '20px' }}>🎵</span>;
                      }
                      if (file.mime_type?.includes('pdf')) {
                        return <span style={{ fontSize: '20px' }}>📄</span>;
                      }
                      return <span style={{ fontSize: '20px' }}>📁</span>;
                    })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="editor-sidebar-search-result-title" style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.filename || 'Fichier sans nom'}
                    </div>
                    {file.description && (
                      <div className="editor-sidebar-search-result-desc" style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-tertiary)',
                        lineHeight: '1.4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        marginTop: '4px'
                      }}>
                        {file.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

