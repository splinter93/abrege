"use client";
import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import './FolderManagerModern.css';
import FolderContent from './FolderContent';
import { useFolderManagerState } from './useFolderManagerState';
import { useAuth } from '@/hooks/useAuth';
import { Folder, FileArticle } from './types';
import { simpleLogger as logger } from '@/utils/logger';
import SimpleContextMenu from './SimpleContextMenu';
import { useFolderDragAndDrop } from '../hooks/useFolderDragAndDrop';
import { useContextMenuManager } from '../hooks/useContextMenuManager';
import { useFolderSelection } from '../hooks/useFolderSelection';
import { useFolderFilter } from '../hooks/useFolderFilter';
import { useFolderKeyboard } from '../hooks/useFolderKeyboard';

import { classeurTabVariants, classeurTabTransition } from './FolderAnimation';
import { useFileSystemStore } from '@/store/useFileSystemStore';

/**
 * Type pour les résultats de recherche
 * Unifie les différents types de ressources recherchables
 */
export interface SearchResult {
  type: 'note' | 'folder' | 'classeur';
  id: string;
  slug: string;
  title: string;
  path?: string;
  classeur_id?: string;
  folder_id?: string;
}

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
  preloadedFolders?: { [key: string]: Folder };
  preloadedNotes?: { [key: string]: FileArticle };
  skipApiCalls?: boolean;
  onCreateFolder?: () => void;
  onCreateFile?: () => void;
  onToggleView?: (mode: 'list' | 'grid') => void;
  viewMode?: 'list' | 'grid';
  onSearchResult?: (result: SearchResult) => void; // ✅ Type strict

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
  onGoToRoot,
  onGoToFolder,
  folderPath,
  preloadedFolders,
  preloadedNotes,
  skipApiCalls = false,
  onCreateFolder,
  onCreateFile,
  onToggleView,
  viewMode = 'grid',
  onSearchResult,

}) => {
  // Optimisation : éviter les appels API redondants
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  
  // Conditionner l'utilisation du hook selon les données préchargées
  const usePreloadedData = skipApiCalls && preloadedFolders && preloadedNotes;
  
  const folderManagerState = useFolderManagerState(
    classeurId, 
    user?.id || '', 
    parentFolderId, 
    usePreloadedData ? 0 : refreshKey
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

  // Utiliser les données préchargées ou les données de l'API
  const folders = usePreloadedData ? Object.values(preloadedFolders || {}) : apiFolders;
  const files = usePreloadedData ? Object.values(preloadedNotes || {}) : apiFiles;
  
  // Écouter les changements du store Zustand pour les mises à jour temps réel
  const storeFolders = useFileSystemStore((state) => state.folders);
  const storeNotes = useFileSystemStore((state) => state.notes);
  
  // Fusion intelligente des données pour éviter les doublons
  // Note: store peut contenir Note (du store Zustand) qui n'a pas tous les champs de FileArticle
  const mergeData = useCallback((preloaded: (Folder | FileArticle)[], store: Record<string, Folder | FileArticle | { id: string; [key: string]: unknown }>) => {
    const storeArray = Object.values(store);
    
    // Si pas de données préchargées, utiliser le store
    if (!preloaded || preloaded.length === 0) {
      return storeArray;
    }
    
    // Si pas de données dans le store, utiliser les données préchargées
    if (storeArray.length === 0) {
      return preloaded;
    }
    
    // Fusion intelligente : combiner les deux sources en évitant les doublons
    const merged = new Map();
    
    // D'abord, ajouter les données préchargées
    preloaded.forEach(item => {
      if (item && item.id) {
        merged.set(item.id, item);
      }
    });
    
    // Ensuite, ajouter/remplacer par les données du store (plus récentes)
    storeArray.forEach(item => {
      if (item && item.id) {
        merged.set(item.id, item);
      }
    });
    
    return Array.from(merged.values());
  }, []);
  
  // Utiliser la fusion intelligente
  // storeFolders et storeNotes sont des Record<string, Folder | FileArticle | Note>
  // Note: Note du store peut ne pas avoir tous les champs de FileArticle
  // Utiliser unknown pour contourner la limitation de type TypeScript
  const effectiveFolders = mergeData(
    usePreloadedData ? Object.values(preloadedFolders || {}) : [],
    storeFolders as unknown as Record<string, Folder | FileArticle | { id: string; [key: string]: unknown }>
  );
  const effectiveFiles = mergeData(
    usePreloadedData ? Object.values(preloadedNotes || {}) : [],
    storeNotes as unknown as Record<string, Folder | FileArticle | { id: string; [key: string]: unknown }>
  );
  
  // Filtrer les données par classeur actif ET par dossier parent
  const filteredFolders = effectiveFolders.filter((f): f is Folder => 
    f && 'classeur_id' in f && f.classeur_id === classeurId && 
    (f.parent_id === parentFolderId || (!f.parent_id && !parentFolderId))
  );
  const filteredFiles = effectiveFiles.filter((n): n is FileArticle => 
    n && 'classeur_id' in n && n.classeur_id === classeurId && 
    (n.folder_id === parentFolderId || (!n.folder_id && !parentFolderId))
  );

  // Debug: Log des dossiers filtrés pour diagnostiquer les problèmes
  if (process.env.NODE_ENV === 'development') {
    logger.dev('[FolderManager] 📁 Dossiers filtrés', {
      classeurId,
      parentFolderId,
      folders: filteredFolders.map(f => ({ id: f.id, name: f.name, parent_id: f.parent_id, classeur_id: f.classeur_id }))
    });
  }
  
  // Pas de loading si données préchargées
  const effectiveLoading = usePreloadedData ? false : loading;
  const effectiveError = usePreloadedData ? null : error;
  
  // Garder les handlers actifs même avec données préchargées
  const effectiveStartRename = startRename;
  const effectiveSubmitRename = submitRename;
  const effectiveCancelRename = cancelRename;
  const effectiveCreateFolder = createFolder;
  const effectiveCreateFile = createFile;
  const effectiveDeleteFolder = deleteFolder;
  const effectiveDeleteFile = deleteFile;
  const effectiveMoveItem = moveItem;

  const handleCreateFolder = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // 🎯 NOUVEAU: Créer avec un nom par défaut, le renommage inline se déclenchera automatiquement
      const defaultName = 'Nouveau dossier';
      await effectiveCreateFolder(defaultName);
    } catch (error) {
      logger.error('[FolderManager] Erreur création dossier', error instanceof Error ? error : new Error(String(error)));
    }
  }, [user?.id, effectiveCreateFolder]);

  const handleCreateFile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // 🎯 NOUVEAU: Créer avec un nom par défaut, le renommage inline se déclenchera automatiquement
      const defaultName = 'Nouvelle note';
      await effectiveCreateFile(defaultName, parentFolderId || null);
    } catch (error) {
      logger.error('[FolderManager] Erreur création note', error instanceof Error ? error : new Error(String(error)));
    }
  }, [user?.id, effectiveCreateFile, parentFolderId]);

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
    handleCopyId,
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
              classeurIcon={classeurIcon}
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
              onCreateFolder={handleCreateFolder}
              onCreateFile={handleCreateFile}
              onToggleView={onToggleView}
              viewMode={viewMode}
              // 🔧 NOUVEAU: Passer les props de navigation
              parentFolderId={parentFolderId}
              onGoBack={onGoBack}
              onGoToRoot={onGoToRoot}
              onGoToFolder={onGoToFolder}
              folderPath={folderPath}
              // 🔧 NOUVEAU: Passer la prop de recherche
              onSearchResult={onSearchResult}

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
              // Ajouter "Copier l'ID" seulement pour les fichiers (notes)
              ...(!('name' in contextMenuState.item) ? [{ label: 'Copier l\'ID', onClick: handleCopyId }] : []),
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