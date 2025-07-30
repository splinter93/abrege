"use client";
import React, { useState, useCallback } from 'react';
import '@/styles/folder-manager-utilities.css';
import './FolderManagerModern.css';
import FolderContent from './FolderContent';
import FolderToolbar, { ViewMode } from './FolderToolbar';
import { useFolderManagerState } from './useFolderManagerState';
import { Folder, FileArticle } from './types';
import SimpleContextMenu from './SimpleContextMenu';
import { useFolderDragAndDrop } from '../hooks/useFolderDragAndDrop';
import { useContextMenuManager } from '../hooks/useContextMenuManager';
import { useFolderSelection } from '../hooks/useFolderSelection';
import { useFolderFilter } from '../hooks/useFolderFilter';
import { useFolderKeyboard } from '../hooks/useFolderKeyboard';

interface FolderManagerProps {
  classeurId: string;
  classeurName: string;
  classeurIcon?: string;
  parentFolderId?: string;
  onFolderOpen: (folder: Folder) => void;
  onGoBack: () => void;
  // Ajout des données filtrées
  filteredFolders?: Folder[];
  filteredNotes?: FileArticle[];
}

/**
 * FolderManager - Gestionnaire de dossiers et fichiers avec drag & drop
 * Interface moderne avec glassmorphism et animations fluides
 * Rôle de présentateur : utilise des hooks pour la logique métier
 */
const FolderManager: React.FC<FolderManagerProps> = ({ 
  classeurId, 
  classeurName, 
  parentFolderId, 
  onFolderOpen, 
  onGoBack,
  filteredFolders,
  filteredNotes
}) => {
  // Optimisation : éviter les appels API redondants
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    loading,
    error,
    renamingItemId,
    startRename,
    submitRename,
    cancelRename,
    createFolder,
    createFile,
    deleteFolder,
    deleteFile,
    moveItem,
  } = useFolderManagerState(classeurId, parentFolderId, refreshKey);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const refreshNow = useCallback(() => setRefreshKey(k => k + 1), []);

  // Hook pour filtrer et valider les données
  const { safeFolders, safeFiles } = useFolderFilter({
    folders: filteredFolders,
    notes: filteredNotes
  });

  // Hook pour la sélection et navigation
  const { handleFileOpen } = useFolderSelection({
    onFolderOpen
  });

  // Hook pour le menu contextuel
  const {
    contextMenuState,
    handleContextMenuItem,
    handleOpen,
    handleRename,
    handleDelete,
    closeContextMenu
  } = useContextMenuManager({
    onFolderOpen,
    onFileOpen: handleFileOpen,
    startRename,
    deleteFolder,
    deleteFile
  });

  // Hook pour le drag & drop
  const {
    handleDropItem,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop
  } = useFolderDragAndDrop({
    classeurId,
    parentFolderId,
    moveItem,
    refreshNow,
    setRefreshKey
  });

  // Hook pour les raccourcis clavier
  useFolderKeyboard({
    closeContextMenu
  });

  // Handler pour déclencher le renommage inline au clic sur le nom
  const handleStartRenameFolderClick = useCallback((folder: Folder) => {
    startRename(folder.id, 'folder');
  }, [startRename]);

  const handleStartRenameFileClick = useCallback((file: FileArticle) => {
    startRename(file.id, 'file');
  }, [startRename]);

  // Handler pour créer et renommer un fichier
  const handleCreateAndRenameFile = async () => {
    const newFile = await createFile('', parentFolderId || null); // Le nom sera généré automatiquement
    if (newFile && newFile.id) {
      startRename(newFile.id, 'file');
    }
  };

  return (
    <div className="folder-manager-modern">
      <div 
        className="folder-manager-root"
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        <div className="folder-manager-container">
          {/* Header avec titre et contrôles */}
          <div className="folder-manager-header">
            <div>
              <h1 className="classeur-header-title">{classeurName}</h1>
              {parentFolderId && (
                <div className="breadcrumbs">
                  <button onClick={onGoBack} className="breadcrumb-item">
                    ← Retour
                  </button>
                </div>
              )}
            </div>
            <div className="view-controls">
                              <FolderToolbar
                  onCreateFolder={() => createFolder('Nouveau dossier')}
                  onCreateFile={handleCreateAndRenameFile}
                  onToggleView={setViewMode}
                  viewMode={viewMode}
                />
            </div>
          </div>

          {/* Contenu principal */}
          <FolderContent
            classeurName={classeurName}
            folders={safeFolders}
            files={safeFiles}
            loading={loading}
            error={error}
            onFolderOpen={onFolderOpen}
            onFileOpen={handleFileOpen}
            renamingItemId={renamingItemId}
            onRenameFile={(id, newName, type) => submitRename(id, newName, type)}
            onRenameFolder={(id, newName, type) => submitRename(id, newName, type)}
            onCancelRename={cancelRename}
            onContextMenuItem={handleContextMenuItem}
            onDropItem={handleDropItem}
            onStartRenameFolderClick={handleStartRenameFolderClick}
            onStartRenameFileClick={handleStartRenameFileClick}
          />
        </div>
      </div>

      {/* Menu contextuel */}
      {contextMenuState.visible && contextMenuState.item && (
        <SimpleContextMenu
          x={contextMenuState.x}
          y={contextMenuState.y}
          visible={contextMenuState.visible}
          options={[
            { label: 'Ouvrir', onClick: handleOpen },
            { label: 'Renommer', onClick: handleRename },
            { label: 'Supprimer', onClick: handleDelete }
          ]}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default FolderManager; 