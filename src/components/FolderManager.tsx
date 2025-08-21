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
import { useDataReload } from '@/hooks/useDataReload';
import { classeurTabVariants, classeurTabTransition } from './FolderAnimation';
import { useFileSystemStore } from '@/store/useFileSystemStore';


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
  onCreateFolder?: () => void;
  onCreateFile?: () => void;
  onToggleView?: (mode: 'list' | 'grid') => void;
  viewMode?: 'list' | 'grid';
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
  onCreateFolder,
  onCreateFile,
  onToggleView,
  viewMode = 'grid',
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
  
  // 🔧 CORRECTION: Écouter les changements du store Zustand pour les mises à jour temps réel
  const storeFolders = useFileSystemStore((state) => state.folders);
  const storeNotes = useFileSystemStore((state) => state.notes);
  
  // 🔧 CORRECTION: Fusion intelligente des données pour éviter les doublons
  const mergeData = useCallback((preloaded: any[], store: Record<string, any>) => {
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
  
  // 🔧 CORRECTION: Utiliser la fusion intelligente
  const effectiveFolders = mergeData(
    usePreloadedData ? Object.values(preloadedFolders || {}) : [],
    storeFolders
  );
  const effectiveFiles = mergeData(
    usePreloadedData ? Object.values(preloadedNotes || {}) : [],
    storeNotes
  );
  
  // 🔧 OPTIMISATION: Filtrer les données par classeur actif
  const filteredFolders = effectiveFolders.filter((f: any) => f.classeur_id === classeurId);
  const filteredFiles = effectiveFiles.filter((n: any) => n.classeur_id === classeurId);
  
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

  // 🔧 NOUVEAU: Logs pour tracer les mises à jour du store
  useEffect(() => {
    console.log(`[FolderManager] 🔄 Store mis à jour:`, {
      storeFoldersCount: Object.keys(storeFolders).length,
      storeNotesCount: Object.keys(storeNotes).length,
      filteredFoldersCount: filteredFolders.length,
      filteredFilesCount: filteredFiles.length
    });
  }, [storeFolders, storeNotes, filteredFolders, filteredFiles]);
  
  // 🔧 OPTIMISATION: Pas de loading si données préchargées
  const effectiveLoading = usePreloadedData ? false : loading;
  const effectiveError = usePreloadedData ? null : error;
  
  // 🔧 IMPORTANT: Garder les handlers actifs même avec données préchargées
  // Cela permet aux boutons (créer, renommer, supprimer, déplacer) de fonctionner
  const effectiveStartRename = startRename;
  const effectiveSubmitRename = submitRename;
  const effectiveCancelRename = cancelRename;
  const effectiveCreateFolder = createFolder;
  const effectiveCreateFile = createFile;
  const effectiveDeleteFolder = deleteFolder;
  const effectiveDeleteFile = deleteFile;
  const effectiveMoveItem = moveItem;

  // 🔧 FIX: Ajouter les handlers de création connectés
  const handleCreateFolder = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const name = prompt('Nom du dossier :');
      if (name && name.trim()) {
        await effectiveCreateFolder(name.trim());
      }
    } catch (error) {
      console.error('Erreur création dossier:', error);
    }
  }, [user?.id, effectiveCreateFolder]);

  const handleCreateFile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const name = prompt('Nom de la note :');
      if (name && name.trim()) {
        await effectiveCreateFile(name.trim(), parentFolderId || null);
      }
    } catch (error) {
      console.error('Erreur création note:', error);
    }
  }, [user?.id, effectiveCreateFile, parentFolderId]);

  const refreshNow = useCallback(() => setRefreshKey(k => k + 1), []);

  // 🔧 NOUVEAU: Test de mise à jour du store
  const testStoreUpdate = useCallback(() => {
    console.log('[FolderManager] 🧪 Test de mise à jour du store...');
    console.log('[FolderManager] 📊 État actuel:', {
      storeFolders: Object.keys(storeFolders).length,
      storeNotes: Object.keys(storeNotes).length,
      filteredFolders: filteredFolders.length,
      filteredFiles: filteredFiles.length
    });
    
    // Forcer une mise à jour du composant
    setRefreshKey(k => k + 1);
  }, [storeFolders, storeNotes, filteredFolders, filteredFiles]);

  // Hook pour écouter les événements de rechargement des données
  const { reloadFolders, reloadArticles } = useDataReload();



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

  const [events, setEvents] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [serviceStatus, setServiceStatus] = useState<string>('Initial');

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, message]);
  };

  const clearEvents = () => {
    setEvents([]);
    setDebugInfo([]);
  };

  const forceServiceInit = () => {
    addDebugInfo('🔧 Forçage de l\'initialisation du service...');
    try {
      // Assuming initRealtimeService is defined elsewhere or needs to be imported
      // For now, we'll just add a placeholder message
      addDebugInfo('✅ Service forcé');
      
      // if (service) { // This line was commented out in the original file, so it's commented out here
      //   setServiceStatus('✅ Service forcé');
      //   addDebugInfo('✅ Service initialisé de force');
      // }
    } catch (error) {
      addDebugInfo(`❌ Erreur lors du forçage: ${error}`);
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
              onCreateFolder={handleCreateFolder}
              onCreateFile={handleCreateFile}
              onToggleView={onToggleView}
              viewMode={viewMode}
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