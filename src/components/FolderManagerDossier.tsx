'use client';
import React, { useState } from 'react';
import { useFolderManagerState } from './useFolderManagerState';
import FolderToolbar, { ViewMode } from './FolderToolbar';
import FolderContent from './FolderContent';
import FolderContextMenu from './FolderContextMenu';
import { useContextMenu } from './useContextMenu';
import { useRouter } from 'next/navigation';
import { Folder, FileArticle } from './types';

interface FolderManagerDossierProps {
  classeurId: string;
  dossierId: string;
  dossierName: string;
}

const FolderManagerDossier: React.FC<FolderManagerDossierProps> = ({ classeurId, dossierId, dossierName }) => {
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
  } = useFolderManagerState(classeurId, dossierId);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const contextMenu = useContextMenu();
  const router = useRouter();

  // Handlers pour FolderContent
  const handleItemClick = (item: any) => {
    if (item.type === 'folder') goToFolder(item.id);
    else handleFileOpen(item);
  };

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
    const newFile = await createFile('Nouvelle note');
    if (newFile && newFile.id) {
      startRename(newFile.id, 'file');
    }
  };

  // Header minimal dossier
  const handleBack = () => {
    router.back();
  };

  // Gestion touche Échap pour sortir
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Icône dossier vide
  const EmptyIcon = (
    <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{margin: '0 auto 10px auto', display: 'block'}}>
      <rect width="64" height="64" rx="12" fill="#2a2320"/>
      <path d="M12 48V20a4 4 0 0 1 4-4h12l4 6h16a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4Z" fill="#FF9800"/>
    </svg>
  );

  // Handler final pour le drop, défini ici.
  const handleDropItem = (itemId: string, itemType: 'folder' | 'file', targetFolderId: string) => {
    console.log('[DND] FolderManagerDossier handleDropItem', { itemId, itemType, targetFolderId });
    // Empêche un dossier d'être déposé sur lui-même
    if (itemType === 'folder' && itemId === targetFolderId) {
      console.warn('Action empêchée : un dossier ne peut pas être imbriqué dans lui-même.');
      return;
    }
    moveItem(itemId, targetFolderId, itemType);
  };

  return (
    <div
      className="folder-manager-root folder-manager-container"
      style={{
        background: 'rgba(30,30,40,0.22)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
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
      {/* Header dossier minimal */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 32px 8px 32px',
        minHeight: 64,
      }}>
        <button onClick={handleBack} style={{ fontSize: 22, marginRight: 18, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="Retour">←</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2, color: '#fff', margin: 0, lineHeight: 1.2, flex: 1, textAlign: 'left', textShadow: '0 1px 8px rgba(0,0,0,0.10)' }}>{dossierName}</h2>
        <div style={{ marginLeft: 32 }}>
          <FolderToolbar
            onCreateFolder={() => createFolder('Nouveau dossier')}
            onCreateFile={handleCreateAndRenameFile}
            onToggleView={setViewMode}
            viewMode={viewMode}
          />
        </div>
      </div>
      <FolderContent
        classeurName={dossierName}
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
        emptyMessage={
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 60}}>
            {EmptyIcon}
            <div className="font-medium mb-1" style={{fontSize: 22, color: '#fff', textAlign: 'center', marginTop: 0}}>Ce dossier est vide.</div>
          </div>
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

export default FolderManagerDossier; 