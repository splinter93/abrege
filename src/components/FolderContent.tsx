import React from 'react';
import { motion } from 'framer-motion';

import FolderItem from './FolderItem';
import FileItem from './FileItem';
import FolderToolbar, { ViewMode } from './FolderToolbar';
import FolderBreadcrumb from './FolderBreadcrumb';

import { Folder, FileArticle } from './types';
import './FolderContent.css';
import './FolderGridItems.css';
import './FolderBreadcrumb.css';
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
  onCreateFolder?: () => void;
  onCreateFile?: () => void;
  onToggleView?: (mode: ViewMode) => void;
  viewMode?: ViewMode;
  // Navigation props for folder hierarchy
  parentFolderId?: string;
  onGoBack?: () => void;
  onGoToRoot?: () => void;
  onGoToFolder?: (folderId: string) => void;
  folderPath?: Folder[];

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
  onCreateFolder,
  onCreateFile,
  onToggleView,
  viewMode = 'grid',
  // Navigation props for folder hierarchy
  parentFolderId,
  onGoBack,
  onGoToRoot,
  onGoToFolder,
  folderPath = [],
  // 🔧 NOUVEAU: Props pour le ClasseurBandeau intégré
  classeurs,
  activeClasseurId,
  onSelectClasseur,
  onCreateClasseur,
  onRenameClasseur,
  onDeleteClasseur,
}) => {
  // Robustness: always use arrays to avoid React #310 errors
  const safeFolders = Array.isArray(folders) ? folders : [];
  const safeFiles = Array.isArray(files) ? files : [];

  if (loading) {
    return (
      <div className="folder-content-loading">
        <div className="folder-loading-spinner">⏳</div>
        <span>Loading...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="folder-content-error">
        <span className="folder-error-icon">😕</span>
        <span>An error occurred while loading the classeur.</span>
      </div>
    );
  }

  return (
    <div className="folder-content-container">
      {/* Header with classeur title and toolbar */}
      <div className="folder-content-header">
        <div className="folder-content-title">
          {/* 🔧 NOUVEAU: Breadcrumb intégré dans le titre */}
          {isInFolder && onGoToRoot && onGoToFolder ? (
            <div className="classeur-title-with-breadcrumb">
              <FolderBreadcrumb
                folderPath={folderPath}
                classeurName={classeurName}
                onGoToRoot={onGoToRoot}
                onGoToFolder={onGoToFolder}
              />
            </div>
          ) : (
            <h1 className="classeur-title">{classeurName}</h1>
          )}
        </div>
        
        {/* Toolbar with creation buttons and view toggle */}
        {onCreateFolder && onCreateFile && onToggleView && (
          <FolderToolbar
            onCreateFolder={onCreateFolder}
            onCreateFile={onCreateFile}
            onToggleView={onToggleView}
            viewMode={viewMode}
          />
        )}
      </div>

      {safeFolders.length === 0 && safeFiles.length === 0 ? (
        emptyMessage ? (
          emptyMessage
        ) : (
          <div className="folder-content-empty">
            <div className="folder-empty-icon">📁</div>
            <div className="folder-empty-title">
              {isInFolder ? 'This folder is empty.' : 'This classeur is empty.'}
            </div>
            <div className="folder-empty-subtitle">Create your first folder or note using the toolbar.</div>
          </div>
        )
      ) : (
        /* Container for grids - macOS style */
        <div className="folder-grid-container">
          {/* Grid for folders */}
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
                    // Simplified validation: allow drop if onDropItem exists
                    // Complete validation is done at API level
                    if (onDropItem) {
                      onDropItem(itemId, itemType, folder.id);
                    }
                  }}
                  onStartRenameClick={onStartRenameFolderClick}
                />
              </div>
            ))}
          </div>
          {/* Grid for files */}
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
      )}
    </div>
  );
};

export default FolderContent; 