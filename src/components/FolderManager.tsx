"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import './FolderManagerModern.css';
import FolderContent from './FolderContent';
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
  // 🔧 NOUVEAU: Données préchargées pour éviter les appels API redondants
  preloadedFolders?: { [key: string]: any };
  preloadedNotes?: { [key: string]: any };
  skipApiCalls?: boolean;
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
  preloadedFolders, // 🔧 NOUVEAU: Données préchargées
  preloadedNotes, // 🔧 NOUVEAU: Données préchargées
  skipApiCalls = false, // 🔧 NOUVEAU: Éviter les appels API
}) => {
  // 🔧 OPTIMISATION: Utiliser les données préchargées si disponibles
  const usePreloadedData = skipApiCalls && preloadedFolders && preloadedNotes;
  
  // Optimisation : éviter les appels API redondants
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  
  // 🔧 OPTIMISATION: Conditionner l'utilisation du hook selon les données préchargées
  const folderManagerState = useFolderManagerState(
    classeurId, 
    user?.id || '', 
    parentFolderId, 
    usePreloadedData ? 0 : refreshKey // 🔧 FIX: Pas de refresh si données préchargées
  );
  
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
    folders: apiFolders,
    files: apiFiles,
  } = folderManagerState;

  // 🔧 OPTIMISATION: Utiliser les données préchargées ou les données de l'API
  const folders = usePreloadedData ? Object.values(preloadedFolders || {}) : apiFolders;
  const files = usePreloadedData ? Object.values(preloadedNotes || {}) : apiFiles;
  
  // 🔧 OPTIMISATION: Filtrer les données par classeur actif
  const filteredFolders = usePreloadedData 
    ? Object.values(preloadedFolders || {}).filter((f: any) => f.classeur_id === classeurId)
    : folders;
  const filteredFiles = usePreloadedData 
    ? Object.values(preloadedNotes || {}).filter((n: any) => n.classeur_id === classeurId)
    : files;
  
  // 🔧 OPTIMISATION: Logs pour tracer le changement de classeur
  useEffect(() => {
    if (usePreloadedData) {
      console.log(`[FolderManager] 🔄 Changement de classeur: ${classeurId}`);
      console.log(`[FolderManager] 📊 Données préchargées:`, {
        totalFolders: Object.keys(preloadedFolders || {}).length,
        totalNotes: Object.keys(preloadedNotes || {}).length,
        filteredFolders: filteredFolders.length,
        filteredFiles: filteredFiles.length
      });
    }
  }, [classeurId, usePreloadedData, preloadedFolders, preloadedNotes, filteredFolders, filteredFiles]);
  
  // 🔧 OPTIMISATION: Pas de loading si données préchargées
  const effectiveLoading = usePreloadedData ? false : loading;
  const effectiveError = usePreloadedData ? null : error;
  
  // 🔧 OPTIMISATION: Fonctions conditionnelles selon le mode
  const effectiveStartRename = usePreloadedData ? () => {} : startRename;
  const effectiveSubmitRename = usePreloadedData ? async () => {} : submitRename;
  const effectiveCancelRename = usePreloadedData ? () => {} : cancelRename;
  const effectiveCreateFolder = usePreloadedData ? async () => {} : createFolder;
  const effectiveCreateFile = usePreloadedData ? async () => {} : createFile;
  const effectiveDeleteFolder = usePreloadedData ? async () => {} : deleteFolder;
  const effectiveDeleteFile = usePreloadedData ? async () => {} : deleteFile;
  const effectiveMoveItem = usePreloadedData ? async () => {} : moveItem;

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
    startRename: effectiveStartRename,
    deleteFolder: effectiveDeleteFolder,
    deleteFile: effectiveDeleteFile
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
    moveItem: effectiveMoveItem,
    refreshNow,
    setRefreshKey,
    userId: user?.id || ''
  });

  // Hook pour les raccourcis clavier
  useFolderKeyboard({ closeContextMenu });

  // Handler pour déclencher le renommage inline au clic sur le nom
  const handleStartRenameFolderClick = useCallback((folder: Folder) => {
    effectiveStartRename(folder.id, 'folder');
  }, [effectiveStartRename]);

  const handleStartRenameFileClick = useCallback((file: FileArticle) => {
    effectiveStartRename(file.id, 'file');
  }, [effectiveStartRename]);

  return (
    <div className="folder-manager-wrapper">
      <div 
        className="folder-manager"
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        <div className="folder-manager-content">
          {/* Contenu principal */}
          <main className="folder-manager-main">
            <FolderContent
              classeurName={classeurName}
              folders={filteredFolders}
              files={filteredFiles}
              loading={effectiveLoading}
              error={effectiveError}
              onFolderOpen={onFolderOpen}
              onFileOpen={handleFileOpen}
              renamingItemId={renamingItemId}
              onRenameFile={(id, newName, type) => effectiveSubmitRename(id, newName, type)}
              onRenameFolder={(id, newName, type) => effectiveSubmitRename(id, newName, type)}
              onCancelRename={effectiveCancelRename}
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