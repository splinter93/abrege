import React from 'react';
// import { motion, AnimatePresence } from 'framer-motion'; // Désactivé pour interface simple

import FolderItem from './FolderItem';
import FileItem from './FileItem';
import { Folder, FileArticle } from './types';
import './FolderContent.css';

interface FolderContentProps {
  classeurName: string;
  toolbar?: React.ReactNode;
  folders: Folder[];
  files: FileArticle[];
  loading: boolean;
  error: string | null;
  onFolderOpen: (folder: Folder) => void;
  onFileOpen: (file: FileArticle) => void;
  renamingItemId?: string | null;
  onRenameFile?: (id: string, newName: string, type: 'folder' | 'file') => void;
  onRenameFolder?: (id: string, newName: string, type: 'folder' | 'file') => void;
  onCancelRename?: () => void;
  onContextMenuItem?: (e: React.MouseEvent, item: Folder | FileArticle) => void;
  emptyMessage?: React.ReactNode;
  onDropItem?: (itemId: string, itemType: 'folder' | 'file', targetFolderId: string) => void;
  onStartRenameFolderClick?: (folder: Folder) => void;
  onStartRenameFileClick?: (file: FileArticle) => void;
  isInFolder?: boolean; /* New prop to detect folder context */
}

const FolderContent: React.FC<FolderContentProps> = ({
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
  classeurName,
  isInFolder,
}) => {
  // Robustesse : toujours un tableau pour éviter les erreurs React #310
  const safeFolders = Array.isArray(folders) ? folders : [];
  const safeFiles = Array.isArray(files) ? files : [];
  if (loading) {
    return (
      <div className="folder-content-loading">
        <div className="folder-text-3xl folder-margin-bottom-large folder-animate-spin">⏳</div>
        <span>Chargement…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="folder-content-error">
        <span className="folder-text-xl folder-margin-bottom-small">😕</span>
        <span>Une erreur est survenue lors du chargement du classeur.</span>
      </div>
    );
  }
  if (safeFolders.length === 0 && safeFiles.length === 0) {
    return (
      emptyMessage ? (
        emptyMessage
      ) : (
        <div className="folder-content-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📁</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text-1)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
            {isInFolder ? 'Ce dossier est vide.' : 'Ce classeur est vide.'}
          </div>
          <div>Créez votre premier dossier ou note avec la barre d&apos;outils.</div>
        </div>
      )
    );
  }
  return (
    <div className="folder-content-container">
      {/* Container pour les grilles - style macOS */}
      <div className="folder-grid-container">
        {/* Grille dossiers */}
        <div className="folder-grid">
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
                // Ne traiter le drop que si l'item ET la cible existent dans la vue locale
                const isFolder = itemType === 'folder';
                const isFile = itemType === 'file';
                const itemExists = (isFolder && safeFolders.some(f => f.id === itemId)) || (isFile && safeFiles.some(f => f.id === itemId));
                const targetExists = safeFolders.some(f => f.id === folder.id);
                if (!itemExists || !targetExists) return;
                if (onDropItem) {
                  onDropItem(itemId, itemType, folder.id);
                }
              }}
              onStartRenameClick={onStartRenameFolderClick}
            />
          ))}
        </div>
        {/* Séparateur horizontal */}
        <div className="folder-content-separator"></div>
        {/* Grille fichiers rapprochée */}
        <div className="folder-grid files">
          {safeFiles.map(file => (
            <div
              key={file.id}
              className="file-item-animation"
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FolderContent; 