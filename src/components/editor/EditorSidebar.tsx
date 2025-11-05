'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import ClasseurSelector from './ClasseurSelector';
import EditorNavigationTree from './EditorNavigationTree';
import { useClasseurTree } from '@/hooks/editor/useClasseurTree';
import '@/styles/editor-sidebar.css';

/**
 * EditorSidebar - Sidebar flottante style CHAT
 * 
 * Comportement IDENTIQUE sidebar chat:
 * - Toujours visible (width: 250px)
 * - Cachée par transform: translateX(-250px)
 * - Hover zone 100px à gauche
 * - Pas de mode collapsed
 * - Pas de dividers
 * 
 * @module components/editor/EditorSidebar
 */

interface EditorSidebarProps {
  /** Sidebar visible ou cachée */
  isVisible: boolean;
  /** ID de la note actuellement ouverte */
  currentNoteId: string;
  /** ID du classeur de la note actuelle */
  currentClasseurId?: string | null;
  /** Callback pour switch vers une autre note */
  onNoteSelect: (noteId: string) => void;
}

export default function EditorSidebar({
  isVisible,
  currentNoteId,
  currentClasseurId,
  onNoteSelect
}: EditorSidebarProps) {
  
  // État local du classeur sélectionné
  // ✅ Initialiser avec le classeur de la note actuelle
  const [selectedClasseurId, setSelectedClasseurId] = useState<string | null>(currentClasseurId || null);
  
  // ✅ Mettre à jour si le classeur de la note change
  useEffect(() => {
    if (currentClasseurId && currentClasseurId !== selectedClasseurId) {
      setSelectedClasseurId(currentClasseurId);
    }
  }, [currentClasseurId, selectedClasseurId]);
  
  // Search query local
  const [searchQuery, setSearchQuery] = useState('');
  
  // ✅ État interne pour gérer hover sidebar
  const [isHovered, setIsHovered] = useState(false);

  // Charger l'arborescence du classeur actif
  const { data, loading, error } = useClasseurTree({
    classeurRef: selectedClasseurId,
    depth: 2
  });

  // Handler changement classeur
  const handleClasseurChange = useCallback((classeurId: string) => {
    setSelectedClasseurId(classeurId);
  }, []);

  // ✅ Sidebar visible si hover zone OU hover sidebar
  const shouldBeVisible = isVisible || isHovered;

  return (
    <aside 
      className={`editor-sidebar ${shouldBeVisible ? 'visible' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Search Bar - Style chat exact */}
      <div className="editor-sidebar-search-clean">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search className="editor-sidebar-search-icon-clean" size={16} />
          <input
            type="text"
            placeholder="Rechercher"
            className="editor-sidebar-search-input-clean"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="editor-sidebar-content">
        {/* Classeur Selector */}
        <div className="editor-sidebar-classeur-section">
          <ClasseurSelector
            selectedClasseurId={selectedClasseurId}
            onClasseurChange={handleClasseurChange}
          />
        </div>

        {/* Navigation Tree */}
        {loading && (
          <div className="editor-sidebar-loading">
            <Loader2 size={20} className="animate-spin" />
            <span>Chargement...</span>
          </div>
        )}

        {error && !loading && (
          <div className="editor-sidebar-error">
            Erreur: {error}
          </div>
        )}

        {!loading && !error && data && (
          <EditorNavigationTree
            tree={data.tree}
            notesAtRoot={data.notes_at_root}
            currentNoteId={currentNoteId}
            onNoteSelect={onNoteSelect}
          />
        )}

        {!loading && !error && !data && (
          <div className="editor-sidebar-search-empty">
            Sélectionnez un classeur
          </div>
        )}
      </div>
    </aside>
  );
}
