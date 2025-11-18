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
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const lastWasRightClick = React.useRef(false);

  React.useEffect(() => {
    if (isRenaming) {
      setInputValue(file.source_title);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Positionner le curseur à la fin du texte
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
          // Ajuster la hauteur automatiquement
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
      }, 0);
    }
  }, [isRenaming, file.source_title]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Ajuster la hauteur automatiquement
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onRename) {
      // Cmd/Ctrl + Enter pour valider
      e.preventDefault();
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
        {isRenaming ? (
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className="fm-rename-input"
            autoFocus
            spellCheck={false}
            onClick={e => e.stopPropagation()}
            rows={1}
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