'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Folder, Feather } from 'lucide-react';
import type { TreeFolder, TreeNote } from '@/hooks/editor/useClasseurTree';
import { useContextMenuManager } from '@/hooks/useContextMenuManager';
import SimpleContextMenu from '@/components/SimpleContextMenu';
import type { Folder as FolderType, FileArticle } from '@/components/types';
import { V2UnifiedApi } from '@/services/V2UnifiedApi';
import { simpleLogger as logger } from '@/utils/logger';

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
  /** ID du classeur (pour rafraîchir après modifications) */
  classeurId?: string | null;
  /** Fonction pour rafraîchir l'arborescence */
  onRefresh?: () => Promise<void>;
}

export default function EditorNavigationTree({
  tree,
  notesAtRoot,
  currentNoteId,
  onNoteSelect,
  classeurId,
  onRefresh
}: EditorNavigationTreeProps) {
  
  // État collapsible pour dossiers (Map pour O(1))
  const [collapsedFolders, setCollapsedFolders] = useState<Map<string, boolean>>(new Map());
  
  // API unifiée
  const v2Api = V2UnifiedApi.getInstance();
  
  // Convertir TreeFolder en Folder pour le menu contextuel
  const treeFolderToFolder = useCallback((treeFolder: TreeFolder): FolderType => {
    return {
      id: treeFolder.id,
      name: treeFolder.name,
      parent_id: treeFolder.parent_id || null,
      classeur_id: '', // Pas disponible dans TreeFolder, mais pas utilisé pour le menu
      user_id: '', // Pas disponible dans TreeFolder, mais pas utilisé pour le menu
      created_at: '',
      updated_at: '',
      position: 0
    };
  }, []);
  
  // Convertir TreeNote en FileArticle pour le menu contextuel
  const treeNoteToFileArticle = useCallback((treeNote: TreeNote): FileArticle => {
    return {
      id: treeNote.id,
      source_title: treeNote.source_title || 'Sans titre',
      folder_id: null, // Pas disponible dans TreeNote, mais pas utilisé pour le menu
      classeur_id: '', // Pas disponible dans TreeNote, mais pas utilisé pour le menu
      user_id: '', // Pas disponible dans TreeNote, mais pas utilisé pour le menu
      created_at: treeNote.created_at || '',
      updated_at: treeNote.updated_at || '',
      position: 0
    };
  }, []);
  
  // Handlers pour le menu contextuel
  const handleFolderOpen = useCallback((folder: FolderType) => {
    // Pour l'instant, on ne fait rien (les dossiers sont juste collapsibles)
    logger.debug('[EditorNavigationTree] Ouvrir dossier:', { folderId: folder.id });
  }, []);
  
  const handleFileOpen = useCallback((file: FileArticle) => {
    onNoteSelect(file.id);
  }, [onNoteSelect]);
  
  const handleStartRename = useCallback((id: string, type: 'folder' | 'file') => {
    // TODO: Implémenter le renommage inline (comme dans FolderManager)
    logger.debug('[EditorNavigationTree] Renommer:', { id, type });
    // Pour l'instant, on utilise un prompt simple
    const currentName = type === 'folder'
      ? tree.find(f => f.id === id)?.name || notesAtRoot.find(n => n.id === id)?.source_title || ''
      : notesAtRoot.find(n => n.id === id)?.source_title || tree.flatMap(f => f.notes || []).find(n => n.id === id)?.source_title || '';
    
    const newName = window.prompt(`Renommer ${type === 'folder' ? 'le dossier' : 'la note'}:`, currentName);
    if (newName && newName.trim() && newName !== currentName) {
      if (type === 'folder') {
        v2Api.updateFolder(id, { name: newName.trim() }).then(() => {
          onRefresh?.();
        }).catch(err => {
          logger.error('[EditorNavigationTree] Erreur renommage dossier:', err);
          alert('Erreur lors du renommage du dossier');
        });
      } else {
        v2Api.updateNote(id, { source_title: newName.trim() }).then(() => {
          onRefresh?.();
        }).catch(err => {
          logger.error('[EditorNavigationTree] Erreur renommage note:', err);
          alert('Erreur lors du renommage de la note');
        });
      }
    }
  }, [tree, notesAtRoot, v2Api, onRefresh]);
  
  const handleDeleteFolder = useCallback(async (id: string): Promise<void> => {
    try {
      await v2Api.deleteFolder(id);
      onRefresh?.();
    } catch (err) {
      logger.error('[EditorNavigationTree] Erreur suppression dossier:', err);
      throw err;
    }
  }, [v2Api, onRefresh]);
  
  const handleDeleteFile = useCallback(async (id: string): Promise<void> => {
    try {
      await v2Api.deleteNote(id);
      onRefresh?.();
    } catch (err) {
      logger.error('[EditorNavigationTree] Erreur suppression note:', err);
      throw err;
    }
  }, [v2Api, onRefresh]);
  
  // Menu contextuel
  const {
    contextMenuState,
    handleContextMenuItem,
    handleOpen,
    handleRename,
    handleDelete,
    handleCopyId,
    closeContextMenu
  } = useContextMenuManager({
    onFolderOpen: handleFolderOpen,
    onFileOpen: handleFileOpen,
    startRename: handleStartRename,
    deleteFolder: handleDeleteFolder,
    deleteFile: handleDeleteFile
  });

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
          onContextMenu={handleContextMenuItem}
          treeFolderToFolder={treeFolderToFolder}
          treeNoteToFileArticle={treeNoteToFileArticle}
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
          onContextMenu={(e) => handleContextMenuItem(e, treeNoteToFileArticle(note))}
        />
      ))}
      
      {/* Menu contextuel */}
      {contextMenuState.visible && contextMenuState.item && (
        <SimpleContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          visible={contextMenuState.visible}
          options={[
            { label: 'Ouvrir', onClick: handleOpen },
            { label: 'Renommer', onClick: handleRename },
            // Ajouter "Copier l'ID" seulement pour les fichiers (notes)
            ...(!('name' in contextMenuState.item) ? [{ label: 'Copier l\'ID', onClick: handleCopyId }] : []),
            { label: 'Supprimer', onClick: handleDelete }
          ]}
          onClose={closeContextMenu}
        />
      )}
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
  onContextMenu?: (e: React.MouseEvent, item: FolderType | FileArticle) => void;
  treeFolderToFolder?: (folder: TreeFolder) => FolderType;
  treeNoteToFileArticle?: (note: TreeNote) => FileArticle;
}

const FolderTreeItem = React.memo(function FolderTreeItem({
  folder,
  level,
  currentNoteId,
  collapsedFolders,
  onToggleFolder,
  onNoteClick,
  onContextMenu,
  treeFolderToFolder,
  treeNoteToFileArticle
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
        onContextMenu={onContextMenu && treeFolderToFolder ? (e) => onContextMenu(e, treeFolderToFolder(folder)) : undefined}
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
              onContextMenu={onContextMenu}
              treeFolderToFolder={treeFolderToFolder}
              treeNoteToFileArticle={treeNoteToFileArticle}
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
              onContextMenu={onContextMenu && treeNoteToFileArticle ? (e) => onContextMenu(e, treeNoteToFileArticle(note)) : undefined}
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
  onContextMenu?: (e: React.MouseEvent, item: FileArticle) => void;
  treeNoteToFileArticle?: (note: TreeNote) => FileArticle;
}

const NoteTreeItem = React.memo(function NoteTreeItem({
  note,
  level,
  currentNoteId,
  onNoteClick,
  onContextMenu
}: NoteTreeItemProps) {
  
  const isActive = note.id === currentNoteId;

  // Indentation dynamique (16px par niveau)
  // ✅ Base 8px + offset par niveau pour décalage subtil vers la droite
  const paddingLeft = 8 + (level * 16);

  /**
   * Handler pour le début du drag
   * Transfère le noteId via dataTransfer pour le drop dans l'éditeur
   */
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Stocker le noteId dans le dataTransfer
    e.dataTransfer.setData('application/x-scrivia-note-id', note.id);
    
    // Type d'effet : copy (indique qu'on copie la note, pas qu'on la déplace)
    e.dataTransfer.effectAllowed = 'copy';
    
    // Ajouter classe pour feedback visuel
    e.currentTarget.classList.add('dragging');
  }, [note.id]);

  /**
   * Handler pour la fin du drag
   * Nettoie le feedback visuel
   */
  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
  }, []);

  return (
    <div
      className={`editor-sidebar-note ${isActive ? 'active' : ''}`}
      onDoubleClick={() => onNoteClick(note.id)}
      onContextMenu={onContextMenu}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
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
