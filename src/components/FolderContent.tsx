import React from 'react';
import FolderItem from './FolderItem';
import FileItem from './FileItem';
import { AnimatePresence, motion } from 'framer-motion';

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
  onRenameFile?: (id: string, newName: string, type: 'folder' | 'file') => void;
  onRenameFolder?: (id: string, newName: string, type: 'folder' | 'file') => void;
  onCancelRename?: () => void;
  onContextMenuItem?: (e: React.MouseEvent, item: any) => void;
  emptyMessage?: React.ReactNode;
  onDropItem?: (itemId: string, itemType: 'folder' | 'file', targetFolderId: string) => void;
  onStartRenameFolderClick?: (folder: any) => void;
  onStartRenameFileClick?: (file: any) => void;
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
  onStartRenameFolderClick,
  onStartRenameFileClick,
}) => {
  console.log('[DND] FolderContent render onDropItem', typeof onDropItem, onDropItem);
  // Robustesse : toujours un tableau pour éviter les erreurs React #310
  const safeFolders = Array.isArray(folders) ? folders : [];
  const safeFiles = Array.isArray(files) ? files : [];
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
  if (safeFolders.length === 0 && safeFiles.length === 0) {
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
        {safeFolders.map(folder => (
          <FolderItem
            key={folder.id}
            folder={folder}
            onOpen={onFolderOpen}
            isRenaming={renamingItemId === folder.id}
            onRename={(newName, type) => onRenameFolder && onRenameFolder(folder.id, newName, type)}
            onCancelRename={onCancelRename}
            onContextMenu={onContextMenuItem}
            onDropItem={(itemId, itemType) => {
              // Ne traiter le drop que si l’item ET la cible existent dans la vue locale
              const isFolder = itemType === 'folder';
              const isFile = itemType === 'file';
              const itemExists = (isFolder && safeFolders.some(f => f.id === itemId)) || (isFile && safeFiles.some(f => f.id === itemId));
              const targetExists = safeFolders.some(f => f.id === folder.id);
              if (!itemExists || !targetExists) return;
              console.log('[DND] FolderContent transmit', { itemId, itemType, folderId: folder.id });
              if (onDropItem) {
                onDropItem(itemId, itemType, folder.id);
              }
            }}
            onStartRenameClick={onStartRenameFolderClick}
          />
        ))}
      </div>
      {/* Séparateur horizontal */}
      <div style={{ borderTop: '1.5px solid rgba(255,255,255,0.10)', width: '60%', margin: '60px 0 40px 0' }}></div>
      {/* Grille fichiers rapprochée */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 gap-y-8" style={{justifyItems:'center', width: '100%', marginTop: 25 }}>
        <AnimatePresence initial={false}>
          {safeFiles.map(file => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
              style={{ width: 168, height: 132 }}
            >
              <FileItem
                file={file}
                onOpen={onFileOpen}
                isRenaming={renamingItemId === file.id}
                onRename={(newName, type) => onRenameFile && onRenameFile(file.id, newName, type)}
                onCancelRename={onCancelRename}
                onContextMenu={onContextMenuItem}
                onStartRenameClick={onStartRenameFileClick}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FolderContent; 