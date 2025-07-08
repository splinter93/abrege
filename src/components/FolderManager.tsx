'use client';
import React, { useState } from 'react';
import { useFolderManagerState } from './useFolderManagerState';
import FolderToolbar, { ViewMode } from './FolderToolbar';
import FolderContent from './FolderContent';
import FolderContextMenu from './FolderContextMenu';
import { useContextMenu } from './useContextMenu';
import { useRouter } from 'next/navigation';
import { Folder, FileArticle } from './types';

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
  const contextMenu = useContextMenu();
  const router = useRouter();

  // Handlers pour FolderContent
  const handleItemClick = (item: any) => {
    if (item.type === 'folder') goToFolder(item.id);
    else handleFileOpen(item);
  };
  const handleItemDoubleClick = handleItemClick;

  // Handler pour clic droit sur dossier/fichier
  const handleContextMenuItem = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    contextMenu.openContextMenu(e, item);
  };

  // Handlers pour le menu contextuel
  const handleOpen = () => {
    if (!contextMenu.item) return;
    if (contextMenu.item.type === 'folder') goToFolder(contextMenu.item.id);
    else handleFileOpen(contextMenu.item);
    contextMenu.closeContextMenu();
  };
  const handleRename = () => {
    if (contextMenu.item) startRename(contextMenu.item.id, contextMenu.item.type);
    contextMenu.closeContextMenu();
  };
  const handleDelete = () => {
    if (!contextMenu.item) return;
    if (window.confirm(`Supprimer définitivement « ${contextMenu.item.name || contextMenu.item.source_title} » ?`)) {
      if ('name' in contextMenu.item) deleteFolder(contextMenu.item.id);
      else deleteFile(contextMenu.item.id);
      contextMenu.closeContextMenu();
    }
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
    console.log('[DND] FolderManager handleDropItem', { itemId, itemType, targetFolderId });
    if (itemType === 'folder' && itemId === targetFolderId) {
      console.warn('Action empêchée : un dossier ne peut pas être imbriqué dans lui-même.');
      return;
    }
    moveItem(itemId, targetFolderId, itemType);
  };

  console.log('folders:', folders, 'files:', files);

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
      onContextMenu={e => e.preventDefault()}
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
        onRenameFile={(id, newName) => submitRename(id, newName)}
        onRenameFolder={(id, newName) => submitRename(id, newName)}
        onCancelRename={cancelRename}
        onContextMenuItem={handleContextMenuItem}
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
      <FolderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          visible={contextMenu.visible}
        item={contextMenu.item}
        onOpen={handleOpen}
        onRename={handleRename}
        onDelete={handleDelete}
        onClose={contextMenu.closeContextMenu}
      />
    </div>
  );
};

export default FolderManager; 