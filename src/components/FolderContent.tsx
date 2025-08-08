import React from 'react';
// import.*AnimatePresence.*from 'framer-motion';

import FolderItem from './FolderItem';
import FileItem from './FileItem';
import { Folder, FileArticle } from './types';
import './FolderContent.css';
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
      <motion.div 
        className="folder-content-loading"
        variants={loadingVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="folder-text-3xl folder-margin-bottom-large folder-animate-spin">⏳</div>
        <span>Chargement…</span>
      </motion.div>
    );
  }
  if (error) {
    return (
      <motion.div 
        className="folder-content-error"
        variants={errorVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <span className="folder-text-xl folder-margin-bottom-small">😕</span>
        <span>Une erreur est survenue lors du chargement du classeur.</span>
      </motion.div>
    );
  }
  if (safeFolders.length === 0 && safeFiles.length === 0) {
    return (
      emptyMessage ? (
        emptyMessage
      ) : (
        <motion.div 
          className="folder-content-empty" 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}
          variants={emptyStateVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📁</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text-1)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
            {isInFolder ? 'Ce dossier est vide.' : 'Ce classeur est vide.'}
          </div>
          <div>Créez votre premier dossier ou note avec la barre d&apos;outils.</div>
        </motion.div>
      )
    );
  }
  return (
    <motion.div 
      className="folder-content-container"
      variants={contentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      transition={gridTransition}
    >
      {/* Container pour les grilles - style macOS */}
      <motion.div 
        className="folder-grid-container"
        layout
        transition={gridTransition}
      >
        {/* Grille dossiers */}
        <motion.div 
          className="folder-grid"
          variants={safeFolders.length > 0 ? gridExpandVariants : gridShrinkVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={gridTransition}
          layout
        >
          <AnimatePresence mode="popLayout">
            {safeFolders.map(folder => (
              <motion.div
                key={folder.id}
                variants={gridRowVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                transition={gridTransition}
              >
                <FolderItem
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
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        {/* Séparateur horizontal */}
        <motion.div 
          className="folder-content-separator"
          layout
          transition={gridTransition}
        />
        {/* Grille fichiers rapprochée */}
        <motion.div 
          className="folder-grid files"
          variants={safeFiles.length > 0 ? gridExpandVariants : gridShrinkVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={gridTransition}
          layout
        >
          <AnimatePresence mode="popLayout">
            {safeFiles.map(file => (
              <motion.div
                key={file.id}
                className="file-item-animation"
                variants={gridRowVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                transition={gridTransition}
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
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default FolderContent; 