import React from 'react';

import { FileArticle } from './types';
import { FileIcon } from './CustomIcons';
import { motion } from 'framer-motion';
import { fileItemVariants, fileItemTransition } from './FolderAnimation';
import RenameInput from './RenameInput';

interface FileItemProps {
  file: FileArticle;
  onOpen: (file: FileArticle) => void;
  isRenaming?: boolean;
  onRename?: (newName: string, type: 'folder' | 'file') => void;
  onCancelRename?: () => void;
  onContextMenu?: (e: React.MouseEvent, file: FileArticle) => void;
  onStartRenameClick?: (file: FileArticle) => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, onOpen, isRenaming, onRename, onCancelRename, onContextMenu, onStartRenameClick }) => {
  const lastWasRightClick = React.useRef(false);

  return (
    <div
      draggable={!isRenaming}
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        // Configuration simple du drag
        e.dataTransfer.setData('itemId', file.id);
        e.dataTransfer.setData('itemType', 'file');
        e.dataTransfer.setData('application/json', JSON.stringify({ id: file.id, type: 'file' }));
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <motion.div
        variants={fileItemVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={fileItemTransition}
        className="fm-grid-item file-item-wrapper"
        onMouseDown={e => {
          if (e.button === 2) {
            // Clic droit
            e.preventDefault();
            lastWasRightClick.current = true;
          } else if (e.button === 0) {
            // Clic gauche
            lastWasRightClick.current = false;
          }
        }}
        onClick={() => {
          // Single-click: do not open; only clear right-click flag
          lastWasRightClick.current = false;
        }}
        onDoubleClick={() => {
          if (!isRenaming && !lastWasRightClick.current) {
            onOpen(file);
          }
          lastWasRightClick.current = false;
        }}
        tabIndex={0}
        role="button"
        aria-label={file.source_title}
        onContextMenu={e => {
          e.preventDefault();
          if (onContextMenu) {
            onContextMenu(e, file);
          }
          lastWasRightClick.current = false;
        }}
      >
        <div className="file-icon">
          <FileIcon size={36} />
        </div>
        {isRenaming && onRename && onCancelRename ? (
          <div className="fm-rename-wrap" onClick={e => e.stopPropagation()}>
            <RenameInput
              initialValue={file.source_title}
              onSubmit={(name) => onRename(name, 'file')}
              onCancel={onCancelRename}
              autoFocus
              variant="item"
            />
          </div>
        ) : (
          <span
            className="fm-item-name"
            onClick={e => {
              if (onStartRenameClick) {
                e.stopPropagation();
                onStartRenameClick(file);
              }
            }}
          >{file.source_title}</span>
        )}
      </motion.div>
    </div>
  );
};

export default FileItem;