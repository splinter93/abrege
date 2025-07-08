import React from 'react';
import FolderItem from './FolderItem';
import FileItem from './FileItem';

interface FolderContentProps {
  classeurName: string;
  toolbar?: React.ReactNode;
  folders: any[];
  files: any[];
  loading: boolean;
  error: string | null;
  onFolderOpen: (folder: any) => void;
  onFileOpen: (file: any) => void;
  renamingItemId?: string | null;
  onRenameFile?: (id: string, newName: string) => void;
  onRenameFolder?: (id: string, newName: string) => void;
  onCancelRename?: () => void;
  onContextMenuItem?: (e: React.MouseEvent, item: any) => void;
  emptyMessage?: React.ReactNode;
  onDropItem?: (itemId: string, itemType: 'folder' | 'file', targetFolderId: string) => void;
}

const FolderContent: React.FC<FolderContentProps> = ({
  classeurName,
  toolbar,
  folders,
  files,
  loading,
  error,
  onFolderOpen,
  onFileOpen,
  renamingItemId,
  onRenameFile,
  onRenameFolder,
  onCancelRename,
  onContextMenuItem,
  emptyMessage,
  onDropItem,
}) => {
  console.log('[DND] FolderContent render onDropItem', typeof onDropItem, onDropItem);
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[240px] text-muted-foreground">
        <div className="animate-spin mb-3" style={{ fontSize: 32 }}>⏳</div>
        <span>Chargement…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[240px] text-red-500 text-center">
        <span style={{ fontSize: 22, marginBottom: 8 }}>😕</span>
        <span>Une erreur est survenue lors du chargement du classeur.</span>
      </div>
    );
  }
  if (folders.length === 0 && files.length === 0) {
    return (
      emptyMessage ? (
        emptyMessage
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[240px] text-muted-foreground text-center">
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <div className="font-medium mb-1">Ce classeur est vide.</div>
          <div>Créez votre premier dossier ou note avec la barre d'outils.</div>
        </div>
      )
    );
  }
  return (
    <div style={{ width: '100%', maxWidth: 1400, margin: '32px auto 0 auto', padding: '0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Grille dossiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 gap-y-8" style={{justifyItems:'center', width: '100%'}}>
        {folders.map(folder => (
          <FolderItem
            key={folder.id}
            folder={folder}
            onOpen={onFolderOpen}
            isRenaming={renamingItemId === folder.id}
            onRename={newName => onRenameFolder && onRenameFolder(folder.id, newName)}
            onCancelRename={onCancelRename}
            onContextMenu={onContextMenuItem}
            onDropItem={(itemId, itemType) => {
              console.log('[DND] FolderContent transmit', { itemId, itemType, folderId: folder.id });
              if (onDropItem) {
                onDropItem(itemId, itemType, folder.id);
              }
            }}
          />
        ))}
      </div>
      {/* Séparateur horizontal */}
      <div style={{ borderTop: '1.5px solid rgba(255,255,255,0.10)', width: '60%', margin: '60px 0 40px 0' }}></div>
      {/* Grille fichiers rapprochée */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 gap-y-8" style={{justifyItems:'center', width: '100%', marginTop: 25 }}>
        {files.map(file => (
          <FileItem
            key={file.id}
            file={file}
            onOpen={onFileOpen}
            isRenaming={renamingItemId === file.id}
            onRename={newName => onRenameFile && onRenameFile(file.id, newName)}
            onCancelRename={onCancelRename}
            onContextMenu={onContextMenuItem}
          />
        ))}
      </div>
    </div>
  );
};

export default FolderContent; 