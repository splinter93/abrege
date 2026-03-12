'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, Folder, FileText } from 'lucide-react';
import ClasseurSelector from './ClasseurSelector';
import EditorNavigationTree from './EditorNavigationTree';
import EditorSidebarSearchBar from './EditorSidebarSearchBar';
import EditorSidebarFilesList from './EditorSidebarFilesList';
import { useClasseurTree } from '@/hooks/editor/useClasseurTree';
import { simpleLogger as logger } from '@/utils/logger';
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
  
  // ✅ Mettre à jour directement quand le classeur de la note change
  useEffect(() => {
    if (currentClasseurId) {
      logger.dev('[EditorSidebar] 🔄 Mise à jour classeur sélectionné:', {
        ancien: selectedClasseurId,
        nouveau: currentClasseurId
      });
      setSelectedClasseurId(currentClasseurId);
    }
  }, [currentClasseurId]); // ✅ Sans selectedClasseurId dans les deps
  
  // ✅ État interne pour gérer hover sidebar
  const [isHovered, setIsHovered] = useState(false);
  
  // ✅ Onglet actif : "classeurs" ou "fichiers"
  const [activeTab, setActiveTab] = useState<'classeurs' | 'fichiers'>('classeurs');

  // Charger l'arborescence du classeur actif
  const { data, loading, error, refresh } = useClasseurTree({
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
      {/* Onglets - Tout en haut */}
      <div className="editor-sidebar-tabs">
        <button
          className={`editor-sidebar-tab ${activeTab === 'classeurs' ? 'active' : ''}`}
          onClick={() => setActiveTab('classeurs')}
        >
          <Folder size={16} />
          <span>Notes</span>
        </button>
        <button
          className={`editor-sidebar-tab ${activeTab === 'fichiers' ? 'active' : ''}`}
          onClick={() => setActiveTab('fichiers')}
        >
          <FileText size={16} />
          <span>Files</span>
        </button>
      </div>

      {/* Contenu scrollable */}
      <div className="editor-sidebar-content">
        {activeTab === 'classeurs' ? (
          <>
            <div className="editor-sidebar-search-clean">
              <div>
                <EditorSidebarSearchBar onNoteSelect={onNoteSelect} activeTab={activeTab} />
              </div>
            </div>

            <div className="editor-sidebar-divider" />

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
                classeurId={selectedClasseurId}
                onRefresh={refresh}
              />
            )}

            {!loading && !error && !data && (
              <div className="editor-sidebar-search-empty">
                Sélectionnez un classeur
              </div>
            )}
          </>
        ) : (
          <>
            <div className="editor-sidebar-search-clean">
              <div>
                <EditorSidebarSearchBar onNoteSelect={onNoteSelect} activeTab={activeTab} />
              </div>
            </div>

            <div className="editor-sidebar-divider" />

            <EditorSidebarFilesList onNoteSelect={onNoteSelect} />
          </>
        )}
      </div>
    </aside>
  );
}
