import React from 'react';
import { motion } from 'framer-motion';

import FolderItem from './FolderItem';
import FileItem from './FileItem';
import { Folder, FileArticle } from './types';
import './FolderContent.css';
import './FolderGridItems.css';
import { 
  contentVariants, 
  loadingVariants, 
  errorVariants, 
  emptyStateVariants,
  fileListVariants,
  folderListVariants,
  gridExpandVariants,
  gridShrinkVariants,
  gridReorderVariants,
  gridRowVariants,
  gridColumnVariants,
  gridTransition,
  gridReorderTransition
} from './FolderAnimation';

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
        <div className="folder-loading-spinner">⏳</div>
        <span>Chargement…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="folder-content-error">
        <span className="folder-error-icon">😕</span>
        <span>Une erreur est survenue lors du chargement du classeur.</span>
      </div>
    );
  }
  if (safeFolders.length === 0 && safeFiles.length === 0) {
    return (
      emptyMessage ? (
        emptyMessage
      ) : (
        <div className="folder-content-empty">
          <div className="folder-empty-icon">📁</div>
          <div className="folder-empty-title">
            {isInFolder ? 'Ce dossier est vide.' : 'Ce classeur est vide.'}
          </div>
          <div className="folder-empty-subtitle">Créez votre premier dossier ou note avec la barre d&apos;outils.</div>
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
            <div key={folder.id} className="folder-item-wrapper">
              <FolderItem
                folder={folder}
                onOpen={onFolderOpen}
                isRenaming={renamingItemId === folder.id}
                onRename={(newName, type) => onRenameFolder && onRenameFolder(folder.id, newName, type)}
                onCancelRename={onCancelRename}
                onContextMenu={onContextMenuItem}
                onDropItem={(itemId, itemType) => {
                  // Validation simplifiée : permettre le drop si onDropItem existe
                  // La validation complète se fait au niveau de l'API
                  if (onDropItem) {
                    onDropItem(itemId, itemType, folder.id);
                  }
                }}
                onStartRenameClick={onStartRenameFolderClick}
              />
            </div>
          ))}
        </div>
        {/* Grille fichiers */}
        <div className="folder-grid files">
          {safeFiles.map(file => (
            <div key={file.id} className="file-item-wrapper">
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