'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Folder, Feather } from 'lucide-react';
import type { TreeFolder, TreeNote } from '@/hooks/editor/useClasseurTree';

/**
 * EditorNavigationTree - Arborescence récursive d'un classeur
 * 
 * Structure:
 * 📂 Dossier A (collapsible)
 *   📂 Sous-dossier A1 (collapsible)
 *     📄 Note 1
 *   📄 Note 2
 * 📄 Note 3 (racine)
 * 
 * Features:
 * - Arborescence récursive illimitée (pratique max 4 niveaux)
 * - Collapsible à tous les niveaux (dossiers)
 * - Indentation dynamique selon le niveau
 * - Highlight note active
 * - Performance: React.memo sur items
 * 
 * @module components/editor/EditorNavigationTree
 */

interface EditorNavigationTreeProps {
  /** Arborescence du classeur (dossiers racine) */
  tree: TreeFolder[];
  /** Notes à la racine du classeur (sans dossier) */
  notesAtRoot: TreeNote[];
  /** ID de la note actuellement active */
  currentNoteId: string;
  /** Callback pour sélectionner une note */
  onNoteSelect: (noteId: string) => void;
}

export default function EditorNavigationTree({
  tree,
  notesAtRoot,
  currentNoteId,
  onNoteSelect
}: EditorNavigationTreeProps) {
  
  // État collapsible pour dossiers (Map pour O(1))
  const [collapsedFolders, setCollapsedFolders] = useState<Map<string, boolean>>(new Map());

  // ✅ Réinitialiser tous les dossiers comme collapsed quand tree change
  useEffect(() => {
    const initialMap = new Map<string, boolean>();
    
    // Fonction récursive pour marquer tous les dossiers comme collapsed
    const markAllCollapsed = (folders: TreeFolder[]) => {
      folders.forEach(folder => {
        initialMap.set(folder.id, true); // ✅ true = collapsed
        if (folder.children && folder.children.length > 0) {
          markAllCollapsed(folder.children);
        }
      });
    };
    
    markAllCollapsed(tree);
    setCollapsedFolders(initialMap);
  }, [tree]); // ✅ Réinitialiser quand tree change (changement classeur)

  // Toggle collapse dossier
  const toggleFolder = useCallback((folderId: string) => {
    setCollapsedFolders(prev => {
      const next = new Map(prev);
      next.set(folderId, !prev.get(folderId));
      return next;
    });
  }, []);

  // Handler sélection note
  const handleNoteClick = useCallback((noteId: string) => {
    onNoteSelect(noteId);
  }, [onNoteSelect]);

  return (
    <div className="editor-sidebar-nav-tree">
      {/* Empty state */}
      {tree.length === 0 && notesAtRoot.length === 0 && (
        <div className="editor-sidebar-search-empty">
          Ce classeur est vide
        </div>
      )}

      {/* Dossiers racine */}
      {tree.map(folder => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          level={0}
          currentNoteId={currentNoteId}
          collapsedFolders={collapsedFolders}
          onToggleFolder={toggleFolder}
          onNoteClick={handleNoteClick}
        />
      ))}

      {/* Notes à la racine (sans dossier) */}
      {notesAtRoot.map(note => (
        <NoteTreeItem
          key={note.id}
          note={note}
          level={0}
          currentNoteId={currentNoteId}
          onNoteClick={handleNoteClick}
        />
      ))}
    </div>
  );
}

/**
 * FolderTreeItem - Item dossier avec récursion
 */
interface FolderTreeItemProps {
  folder: TreeFolder;
  level: number;
  currentNoteId: string;
  collapsedFolders: Map<string, boolean>;
  onToggleFolder: (folderId: string) => void;
  onNoteClick: (noteId: string) => void;
}

const FolderTreeItem = React.memo(function FolderTreeItem({
  folder,
  level,
  currentNoteId,
  collapsedFolders,
  onToggleFolder,
  onNoteClick
}: FolderTreeItemProps) {
  
  const isCollapsed = collapsedFolders.get(folder.id);
  const hasChildren = (folder.children && folder.children.length > 0) || (folder.notes && folder.notes.length > 0);

  // Indentation dynamique (16px par niveau)
  // ✅ Base 8px + offset par niveau pour décalage subtil vers la droite
  const paddingLeft = 8 + (level * 16);

  return (
    <>
      {/* Dossier header */}
      <div
        className={`editor-sidebar-folder ${hasChildren ? 'has-children' : ''} ${!isCollapsed ? 'expanded' : ''}`}
        onClick={() => onToggleFolder(folder.id)}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
      {/* Icône */}
      <div className="editor-sidebar-icon">
        <Folder size={17} />
      </div>
        
        {/* Nom */}
        <div className="editor-sidebar-item-title">
          {folder.name}
        </div>
      </div>

      {/* Enfants (si non collapsed) */}
      {!isCollapsed && (
        <>
          {/* Sous-dossiers (récursif) */}
          {folder.children?.map(subFolder => (
            <FolderTreeItem
              key={subFolder.id}
              folder={subFolder}
              level={level + 1}
              currentNoteId={currentNoteId}
              collapsedFolders={collapsedFolders}
              onToggleFolder={onToggleFolder}
              onNoteClick={onNoteClick}
            />
          ))}

          {/* Notes du dossier */}
          {folder.notes?.map(note => (
            <NoteTreeItem
              key={note.id}
              note={note}
              level={level + 1}
              currentNoteId={currentNoteId}
              onNoteClick={onNoteClick}
            />
          ))}
        </>
      )}
    </>
  );
});

/**
 * NoteTreeItem - Item note
 */
interface NoteTreeItemProps {
  note: TreeNote;
  level: number;
  currentNoteId: string;
  onNoteClick: (noteId: string) => void;
}

const NoteTreeItem = React.memo(function NoteTreeItem({
  note,
  level,
  currentNoteId,
  onNoteClick
}: NoteTreeItemProps) {
  
  const isActive = note.id === currentNoteId;

  // Indentation dynamique (16px par niveau)
  // ✅ Base 8px + offset par niveau pour décalage subtil vers la droite
  const paddingLeft = 8 + (level * 16);

  return (
    <div
      className={`editor-sidebar-note ${isActive ? 'active' : ''}`}
      onDoubleClick={() => onNoteClick(note.id)}
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      {/* Icône */}
      <div className="editor-sidebar-icon">
        <Feather size={17} />
      </div>
      
      {/* Titre */}
      <div className="editor-sidebar-item-title">
        {note.source_title || 'Sans titre'}
      </div>
    </div>
  );
});
