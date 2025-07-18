'use client';
import React, { useState, useCallback } from 'react';
import { useFolderManagerState } from './useFolderManagerState';
import FolderToolbar, { ViewMode } from './FolderToolbar';
import FolderContent from './FolderContent';
import { useRouter } from 'next/navigation';
import { Folder, FileArticle } from './types';
import SimpleContextMenu from './SimpleContextMenu';
import './FolderManager.css';
import { updateFolder, updateArticle } from '../services/supabase';

interface FolderManagerProps {
  classeurId: string;
  classeurName: string;
  classeurIcon?: string;
  parentFolderId?: string;
}

const FolderManager: React.FC<FolderManagerProps> = ({ classeurId, classeurName, parentFolderId }) => {
  // State local pour le dossier courant
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(parentFolderId);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    folders,
    files,
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
  } = useFolderManagerState(classeurId, currentFolderId, refreshKey);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeId, setActiveId] = useState<string | null>(null);
  const router = useRouter();
  const [contextMenuState, setContextMenuState] = useState<{ visible: boolean; x: number; y: number; item: any }>({ visible: false, x: 0, y: 0, item: null });
  // State pour feedback visuel du drop sur la racine
  const [isRootDropActive, setIsRootDropActive] = useState(false);

  // Handlers pour FolderContent
  const handleItemClick = (item: any) => {
    if (item.type === 'folder') handleFolderOpen(item);
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
    if (contextMenuState.item.type === 'folder') handleFolderOpen(contextMenuState.item);
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

  // Handler d'ouverture de dossier (met à jour le state local)
  const handleFolderOpen = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setFolderPath(prev => [...prev, folder]);
  };

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

  // Handler retour (remonte d'un niveau)
  const handleGoBack = () => {
    setCurrentFolderId(undefined);
    setFolderPath([]);
  };

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
        if (data.type === 'folder' && data.id === currentFolderId) {
          setCurrentFolderId(undefined);
          setFolderPath([]);
        }
      }
    } catch (err) {
      // ignore
    }
  };

  // Handler drop sur un tab de classeur (autre ou courant)
  React.useEffect(() => {
    const handler = async (e: any) => {
      const { classeurId, itemId, itemType } = e.detail || {};
      if (!classeurId || !itemId || !itemType) return;
      if (classeurId === classeurId) {
        // Si on drop sur le tab du classeur courant, ramener à la racine
        moveItem(itemId, null, itemType);
      } else {
        // Sinon, changer de classeur ET ramener à la racine
        if (itemType === 'folder') {
          try {
            const res = await updateFolder(itemId, { classeur_id: classeurId, parent_id: null });
            console.log('[DnD] updateFolder', { itemId, classeurId, res });
          } catch (err) {
            console.error('[DnD] updateFolder ERROR', err);
          }
        } else {
          try {
            const res = await updateArticle(itemId, { classeur_id: classeurId, folder_id: null });
            console.log('[DnD] updateArticle', { itemId, classeurId, res });
          } catch (err) {
            console.error('[DnD] updateArticle ERROR', err);
          }
        }
        // Rafraîchir la vue du classeur courant pour que l’item disparaisse
        setRefreshKey(k => k + 1);
      }
    };
    window.addEventListener('drop-to-classeur', handler as any);
    return () => window.removeEventListener('drop-to-classeur', handler as any);
  }, [classeurId, moveItem]);

  // (refreshCurrentView supprimé, remplacé par refreshKey)

  // Breadcrumb local basé sur folderPath
  const breadcrumb = folderPath;

  // Raccourci clavier : Escape ramène à la racine du classeur actif
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCurrentFolderId(undefined);
        setFolderPath([]);
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
        {/* Bouton retour si dans un sous-dossier */}
        {currentFolderId && (
          <button onClick={handleGoBack} style={{ fontSize: 22, marginRight: 18, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="Retour">←</button>
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
            {breadcrumb.length > 0 && (
              <span style={{ color: 'var(--text-2)', fontWeight: 500, fontSize: 18, margin: '0 8px', userSelect: 'none' }}>/</span>
            )}
          </span>
          {/* Breadcrumb dynamique */}
          {breadcrumb.length > 0 && (
            <span style={{ color: 'var(--text-2)', fontWeight: 500, fontSize: 18, display: 'flex', alignItems: 'center', gap: 0 }}>
              {breadcrumb.map((folder, idx) => (
                <span key={folder.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      cursor: idx < breadcrumb.length - 1 ? 'pointer' : 'default',
                      textDecoration: idx < breadcrumb.length - 1 ? 'underline dotted' : 'none',
                      opacity: idx < breadcrumb.length - 1 ? 0.85 : 1,
                      marginRight: 4,
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => {
                      if (idx < breadcrumb.length - 1) {
                        setCurrentFolderId(folder.id);
                        setFolderPath(breadcrumb.slice(0, idx + 1));
                      }
                    }}
                  >
                    {folder.name}
                  </span>
                  {idx < breadcrumb.length - 1 && <span style={{ margin: '0 2px', color: 'var(--text-2)' }}>/</span>}
                </span>
              ))}
            </span>
          )}
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
        classeurName={(currentFolderId && folders.find(f => f.id === currentFolderId)?.name) ? folders.find(f => f.id === currentFolderId)?.name! : classeurName || ''}
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