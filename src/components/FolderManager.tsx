"use client";
import React, { useState, useCallback } from 'react';
import { useFolderManagerState } from './useFolderManagerState';
import FolderToolbar, { ViewMode } from './FolderToolbar';
import FolderContent from './FolderContent';
import { useRouter } from 'next/navigation';
import { Folder, FileArticle } from './types';
import SimpleContextMenu from './SimpleContextMenu';
import './FolderManager.css';
import { updateFolder, updateArticle } from '../services/supabase';
import { toast } from 'react-hot-toast';
import { moveNoteREST } from '../services/api';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { useFileSystemStore } from '@/store/useFileSystemStore';
const selectFolders = (s: FileSystemState) => s.folders;
const selectNotes = (s: FileSystemState) => s.notes;

interface FolderManagerProps {
  classeurId: string;
  classeurName: string;
  classeurIcon?: string;
  parentFolderId?: string;
  onFolderOpen: (folder: any) => void;
  onGoBack: () => void;
  // Ajout des données filtrées
  filteredFolders?: any[];
  filteredNotes?: any[];
}

const FolderManager: React.FC<FolderManagerProps> = ({ 
  classeurId, 
  classeurName, 
  parentFolderId, 
  onFolderOpen, 
  onGoBack,
  filteredFolders,
  filteredNotes
}) => {
  // Utiliser les données filtrées si fournies, sinon récupérer depuis le store
  const foldersObj = useFileSystemStore(selectFolders);
  const notesObj = useFileSystemStore(selectNotes);
  const folders = React.useMemo(() => 
    filteredFolders || Object.values(foldersObj), 
    [filteredFolders, foldersObj]
  );
  const notes = React.useMemo(() => 
    filteredNotes || Object.values(notesObj), 
    [filteredNotes, notesObj]
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    folders: localFolders,
    files: localFiles,
    loading,
    error,
    renamingItemId,
    renamingType,
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const router = useRouter();
  const [contextMenuState, setContextMenuState] = useState<{ visible: boolean; x: number; y: number; item: any }>({ visible: false, x: 0, y: 0, item: null });
  // State pour feedback visuel du drop sur la racine
  const [isRootDropActive, setIsRootDropActive] = useState(false);

  const refreshNow = useCallback(() => setRefreshKey(k => k + 1), []);

  // Handlers pour FolderContent
  const handleItemClick = (item: any) => {
    if (item.type === 'folder') {/* handler du parent */}
    else handleFileOpen(item);
  };
  const handleItemDoubleClick = handleItemClick;

  // Handler pour clic droit sur dossier/fichier
  const handleContextMenuItem = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    setContextMenuState({ visible: true, x: e.clientX, y: e.clientY, item });
  };

  // Handler pour déclencher le renommage inline au clic sur le nom
  const handleStartRenameFolderClick = useCallback((folder: Folder) => {
    startRename(folder.id, 'folder');
  }, [startRename]);

  const handleStartRenameFileClick = useCallback((file: FileArticle) => {
    startRename(file.id, 'file');
  }, [startRename]);

  // Handlers pour le menu contextuel
  const handleOpen = () => {
    if (!contextMenuState.item) return;
    if (contextMenuState.item.type === 'folder') {/* handler du parent */}
    else handleFileOpen(contextMenuState.item);
    closeContextMenu();
  };
  const handleRename = () => {
    if (contextMenuState.item) startRename(contextMenuState.item.id, contextMenuState.item.type);
    closeContextMenu();
  };
  const handleDelete = () => {
    if (!contextMenuState.item) return;
    if (window.confirm(`Supprimer définitivement « ${contextMenuState.item.name || contextMenuState.item.source_title} » ?`)) {
      if ('name' in contextMenuState.item) deleteFolder(contextMenuState.item.id);
      else deleteFile(contextMenuState.item.id);
    }
    closeContextMenu();
  };

  // La navigation doit être gérée par le parent, donc ce handler doit être passé en prop par le parent
  // const handleFolderOpen = ... (à implémenter dans le parent)

  // Handler d'ouverture de fichier (conserve router.push pour les notes)
  const handleFileOpen = (file: FileArticle) => {
    router.push(`/note/${file.id}`);
  };

  // Handler création + renommage inline de note
  const handleCreateAndRenameFile = async () => {
    // On modifie createFile pour retourner le nouvel objet créé
    const newFile = await createFile('Nouvelle note');
    if (newFile && newFile.id) {
      startRename(newFile.id, 'file');
    }
  };

  // Handler d'imbrication DnD
  const handleDropItem = (itemId: string, itemType: 'folder' | 'file', targetFolderId: string) => {
    if (itemType === 'folder' && itemId === targetFolderId) {
      console.warn('Action empêchée : un dossier ne peut pas être imbriqué dans lui-même.');
      return;
    }
    moveItem(itemId, targetFolderId, itemType);
  };

  const closeContextMenu = () => setContextMenuState(cm => ({ ...cm, visible: false }));

  // Idem, le retour doit être géré par le parent
  // const handleGoBack = ... (à implémenter dans le parent)

  // Handler drop sur la racine
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDropActive(true);
  };
  const handleRootDragLeave = () => {
    setIsRootDropActive(false);
  };
  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDropActive(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.id && data.type) {
        moveItem(data.id, null, data.type);
        // Si on déplace le dossier courant, revenir à la racine
        if (data.type === 'folder' && data.id === parentFolderId) {
          // setCurrentFolderId(undefined); // This line is removed
          // setFolderPath([]); // This line is removed
        }
      }
    } catch (err) {
      // ignore
    }
  };

  // Handler drop sur un tab de classeur (autre ou courant)
  React.useEffect(() => {
    console.log('[EFFECT] useEffect triggered in FolderManager (drop-to-classeur)', { classeurId, moveItem, refreshNow, parentFolderId });
    const handler = async (e: any) => {
      const { classeurId: targetClasseurId, itemId, itemType, target } = e.detail || {};
      console.log('[DnD] FolderManager drop-to-classeur event received', { targetClasseurId, itemId, itemType, target, currentClasseurId: classeurId });
      if (!targetClasseurId || !itemId || !itemType) return;
      toast.loading('Déplacement en cours...');
      if (targetClasseurId === classeurId) {
        // Si on drop sur le tab du classeur courant, ramener à la racine
        await moveItem(itemId, null, itemType);
        refreshNow();
        toast.dismiss();
        toast.success('Déplacement terminé !');
      } else {
        // Sinon, changer de classeur ET ramener à la racine
        if (itemType === 'folder') {
          try {
            const res = await updateFolder(itemId, { classeur_id: targetClasseurId, parent_id: null });
            console.log('[DnD] updateFolder', { itemId, targetClasseurId, res });
            refreshNow();
            toast.dismiss();
            toast.success('Déplacement terminé !');
          } catch (err) {
            toast.dismiss();
            toast.error('Erreur lors du déplacement du dossier.');
            console.error('[DnD] updateFolder ERROR', err);
          }
        } else {
          try {
            const res = await moveNoteREST(itemId, { target_classeur_id: targetClasseurId, target_folder_id: null });
            console.log('[DnD] moveNoteREST', { itemId, targetClasseurId, res });
            refreshNow();
            toast.dismiss();
            toast.success('Déplacement terminé !');
          } catch (err) {
            toast.dismiss();
            toast.error('Erreur lors du déplacement de la note.');
            console.error('[DnD] moveNoteREST ERROR', err);
          }
        }
        // Rafraîchir la vue du classeur courant pour que l’item disparaisse
        setRefreshKey(k => k + 1);
      }
    };
    window.addEventListener('drop-to-classeur', handler as any);
    return () => window.removeEventListener('drop-to-classeur', handler as any);
  }, [classeurId, moveItem, refreshNow, parentFolderId]); // Added parentFolderId to dependencies

  // (refreshCurrentView supprimé, remplacé par refreshKey)

  // Breadcrumb local supprimé : navigation pilotée par le parent

  // Robustesse : toujours un tableau pour éviter les erreurs React #310
  const safeFolders = Array.isArray(folders) ? folders : [];
  const safeFiles = Array.isArray(notes) ? notes : [];

  // Raccourci clavier : Escape ramène à la racine du classeur actif
  React.useEffect(() => {
    console.log('[EFFECT] useEffect triggered in FolderManager (Escape)', {});
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // setCurrentFolderId(undefined); // This line is removed
        // setFolderPath([]); // This line is removed
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="folder-manager-root folder-manager-container"
      style={{
        background: 'rgba(30,30,40,0.38)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        padding: '12px 0 0 0',
        margin: '5px 0 0 0',
        maxWidth: '100vw',
        width: '100%',
        minHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Header classeur/dossier modernisé */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 32px 8px 32px',
        minHeight: 64,
      }}>
        {/* Le bouton retour doit appeler le handler du parent */}
        {parentFolderId && (
          <button onClick={onGoBack} style={{ fontSize: 22, marginRight: 18, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="Retour">←</button>
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
        }}>
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 0.2,
            color: '#fff',
            margin: 0,
            lineHeight: 1.2,
            textAlign: 'left',
            textShadow: '0 1px 8px rgba(0,0,0,0.10)',
            fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
          }}>
            {classeurName}
            {/* Breadcrumb dynamique */}
            {/* Breadcrumb local supprimé : navigation pilotée par le parent */}
          </span>
          {/* Breadcrumb dynamique */}
          {/* Breadcrumb local supprimé : navigation pilotée par le parent */}
        </div>
        <div style={{ marginLeft: 32 }}>
          <FolderToolbar
            onCreateFolder={async () => {
              const newFolder = await createFolder('Nouveau dossier');
              if (newFolder && newFolder.id) {
                startRename(newFolder.id, 'folder');
              }
            }}
            onCreateFile={handleCreateAndRenameFile}
            onToggleView={setViewMode}
            viewMode={viewMode}
          />
        </div>
      </div>
      <FolderContent
        classeurName={classeurName || ''}
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
        onStartRenameFolderClick={handleStartRenameFolderClick}
        onStartRenameFileClick={handleStartRenameFileClick}
        toolbar={
          <FolderToolbar
            onCreateFolder={async () => {
              const newFolder = await createFolder('Nouveau dossier');
              if (newFolder && newFolder.id) {
                startRename(newFolder.id, 'folder');
              }
            }}
            onCreateFile={handleCreateAndRenameFile}
            onToggleView={setViewMode}
            viewMode={viewMode}
          />
        }
        onDropItem={handleDropItem}
      />
      <SimpleContextMenu
        x={contextMenuState.x}
        y={contextMenuState.y}
        visible={contextMenuState.visible}
        options={[
          { label: 'Ouvrir', onClick: handleOpen },
          { label: 'Renommer', onClick: handleRename },
          { label: 'Supprimer', onClick: handleDelete },
        ]}
        onClose={closeContextMenu}
      />
    </div>
  );
};

export default FolderManager; 