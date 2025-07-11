'use client';
import React, { useState, useCallback } from 'react';
import { useFolderManagerState } from './useFolderManagerState';
import FolderToolbar, { ViewMode } from './FolderToolbar';
import FolderContent from './FolderContent';
import { useRouter } from 'next/navigation';
import { Folder, FileArticle } from './types';
import SimpleContextMenu from './SimpleContextMenu';
import './FolderManager.css';

interface FolderManagerProps {
  classeurId: string;
  classeurName: string;
  classeurIcon?: string;
  parentFolderId?: string;
}

const FolderManager: React.FC<FolderManagerProps> = ({ classeurId, classeurName, parentFolderId }) => {
  const {
    folders,
    files,
    currentFolderId,
    loading,
    error,
    renamingItemId,
    renamingType,
    startRename,
    submitRename,
    cancelRename,
    goToFolder,
    goBack,
    createFolder,
    createFile,
    deleteFolder,
    deleteFile,
    moveItem,
  } = useFolderManagerState(classeurId, parentFolderId);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeId, setActiveId] = useState<string | null>(null);
  const router = useRouter();
  const [contextMenuState, setContextMenuState] = useState<{ visible: boolean; x: number; y: number; item: any }>({ visible: false, x: 0, y: 0, item: null });

  // Handlers pour FolderContent
  const handleItemClick = (item: any) => {
    if (item.type === 'folder') goToFolder(item.id);
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
    if (contextMenuState.item.type === 'folder') goToFolder(contextMenuState.item.id);
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

  // Handler d'ouverture de dossier
  const handleFolderOpen = (folder: Folder) => {
    router.push(`/classeur/${classeurId}/dossier/${folder.id}`);
  };

  // Handler d'ouverture de fichier
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
      {/* Header classeur modernisé */}
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
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 0.2,
          color: '#fff',
          margin: 0,
          lineHeight: 1.2,
          flex: 1,
          textAlign: 'left',
          textShadow: '0 1px 8px rgba(0,0,0,0.10)',
          fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
        }}>{classeurName}</h2>
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
        classeurName={classeurName}
        folders={folders}
        files={files}
        loading={loading}
        error={error}
        onFolderOpen={handleFolderOpen}
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