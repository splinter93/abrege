"use client";
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import './FolderManagerModern.css';
import FolderContent from './FolderContent';
import FolderToolbar, { ViewMode } from './FolderToolbar';
// import.*LogoScrivia.*from './LogoScrivia';
import { useFolderManagerState } from './useFolderManagerState';
import { useAuth } from '@/hooks/useAuth';
import { Folder, FileArticle } from './types';
import SimpleContextMenu from './SimpleContextMenu';
import { useFolderDragAndDrop } from '../hooks/useFolderDragAndDrop';
import { useContextMenuManager } from '../hooks/useContextMenuManager';
import { useFolderSelection } from '../hooks/useFolderSelection';
import { useFolderFilter } from '../hooks/useFolderFilter';
import { useFolderKeyboard } from '../hooks/useFolderKeyboard';
import { classeurTabVariants, classeurTabTransition } from './FolderAnimation';
import FolderBreadcrumb from './FolderBreadcrumb'; // 🔧 NOUVEAU: Import du breadcrumb

interface FolderManagerProps {
  classeurId: string;
  classeurName: string;
  classeurIcon?: string;
  parentFolderId?: string;
  onFolderOpen: (folder: Folder) => void;
  onGoBack: () => void;
  onGoToRoot: () => void; // 🔧 NOUVEAU: Navigation vers la racine
  onGoToFolder: (folderId: string) => void; // 🔧 NOUVEAU: Navigation directe vers un dossier
  folderPath: Folder[]; // 🔧 NOUVEAU: Chemin de navigation pour le breadcrumb
}

/**
 * FolderManager - Gestionnaire de dossiers et fichiers avec drag & drop
 * Structure simplifiée : 2 niveaux max
 */
const FolderManager: React.FC<FolderManagerProps> = ({ 
  classeurId, 
  classeurName, 
  classeurIcon,
  parentFolderId, 
  onFolderOpen, 
  onGoBack,
  onGoToRoot, // 🔧 NOUVEAU: Navigation vers la racine
  onGoToFolder, // 🔧 NOUVEAU: Navigation directe vers un dossier
  folderPath, // 🔧 NOUVEAU: Chemin de navigation pour le breadcrumb
}) => {
  // Optimisation : éviter les appels API redondants
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
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
    folders,
    files,
  } = useFolderManagerState(classeurId, user?.id || '', parentFolderId, refreshKey);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const refreshNow = useCallback(() => setRefreshKey(k => k + 1), []);

  // Filtrage/validation de sécurité
  const { safeFolders, safeFiles } = useFolderFilter({ folders, notes: files });

  // Hook pour la sélection et navigation
  const { handleFileOpen } = useFolderSelection({ onFolderOpen });

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
    setRefreshKey,
    userId: user?.id || ''
  });

  // Hook pour les raccourcis clavier
  useFolderKeyboard({ closeContextMenu });

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
    <div className="folder-manager-wrapper">
      <div 
        className="folder-manager"
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        <div className="folder-manager-content">
          {/* Header avec nom du classeur et bouton retour */}
          <div className="folder-manager-header">
            <div className="folder-manager-title">
              <span className="folder-manager-icon">{classeurIcon || '📚'}</span>
              <h2 className="folder-manager-name">{classeurName}</h2>
            </div>
            
            {/* 🔧 NOUVEAU: Breadcrumb pour la navigation hiérarchique */}
            <FolderBreadcrumb
              folderPath={folderPath}
              classeurName={classeurName}
              onGoToRoot={onGoToRoot}
              onGoToFolder={onGoToFolder}
            />
            
            {/* 🔧 NOUVEAU: Barre d'outils pour créer dossiers et fichiers */}
            <div className="folder-manager-toolbar">
              <button
                className="toolbar-btn create-folder-btn"
                onClick={() => createFolder('Nouveau dossier')}
                title="Créer un nouveau dossier"
              >
                📁 Nouveau dossier
              </button>
              <button
                className="toolbar-btn create-file-btn"
                onClick={handleCreateAndRenameFile}
                title="Créer une nouvelle note"
              >
                📝 Nouvelle note
              </button>
            </div>
            
            {/* Bouton retour (seulement si on est dans un dossier) */}
            {parentFolderId && (
              <button
                className="folder-manager-back-btn"
                onClick={onGoBack}
                title="Retour au dossier parent"
              >
                ← Retour
              </button>
            )}
          </div>
          
          {/* Séparateur sous le header */}
          <div className="folder-manager-separator"></div>
  
          {/* Contenu principal */}
          <main className="folder-manager-main">
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
              isInFolder={!!parentFolderId}
            />
          </main>
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
    </div>
  );
};

export default FolderManager; 