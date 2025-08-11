import React from 'react';

import { FileArticle } from './types';
import { FileIcon } from './CustomIcons';
import { motion } from 'framer-motion';
import { fileItemVariants, fileItemTransition } from './FolderAnimation';

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
  const [inputValue, setInputValue] = React.useState(file.source_title);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDraggable, setIsDraggable] = React.useState(false);
  const lastWasRightClick = React.useRef(false);

  React.useEffect(() => {
    if (isRenaming) {
      setInputValue(file.source_title);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isRenaming, file.source_title]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onRename) {
      if (inputValue.trim() && inputValue !== file.source_title) {
        onRename(inputValue.trim(), 'file');
      } else if (onCancelRename) {
        onCancelRename();
      }
    } else if (e.key === 'Escape' && onCancelRename) {
      onCancelRename();
    }
  };

  const handleInputBlur = () => {
    if (onRename && inputValue.trim() && inputValue !== file.source_title) {
      onRename(inputValue.trim(), 'file');
    } else if (onCancelRename) {
      onCancelRename();
    }
  };

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
        className="fm-grid-item"
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
          if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, file);
          }
          lastWasRightClick.current = false;
        }}
      >
        <FileIcon size={60} />
        {isRenaming ? (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className="fm-rename-input"
            autoFocus
            spellCheck={false}
            onClick={e => e.stopPropagation()}
          />
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