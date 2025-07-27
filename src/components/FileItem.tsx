import React from 'react';
import '@/styles/folder-manager-utilities.css';
import { FileArticle } from './types';
import { FileIcon } from './CustomIcons';
import { motion } from 'framer-motion';

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

  // const info = file.updated_at ? new Date(file.updated_at).toLocaleDateString() : file.source_type;
  return (
    <div
      draggable={isDraggable}
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        // On ne gère que le clic gauche pour le drag
        if (e.button !== 0) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('itemId', file.id);
        e.dataTransfer.setData('itemType', 'file');
        e.dataTransfer.setData('application/json', JSON.stringify({ id: file.id, type: 'file' }));
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
        className="file-square-container folder-flex-column folder-text-center folder-cursor-pointer folder-transition-all"
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.18)';
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }}
        onMouseDown={e => {
          if (e.button === 2) {
            e.preventDefault();
            lastWasRightClick.current = true;
            setIsDraggable(false);
          } else {
            lastWasRightClick.current = false;
            setIsDraggable(!isRenaming);
          }
        }}
        onClick={() => {
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
          setIsDraggable(!isRenaming);
          lastWasRightClick.current = false;
        }}
      >
        <FileIcon size={64} className="folder-margin-bottom-small" />
        {isRenaming ? (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className="folder-font-medium folder-text-sm folder-text-white folder-text-center folder-margin-top-small folder-bg-transparent folder-border-none folder-shadow-text"
            autoFocus
            spellCheck={false}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="folder-title-multiline folder-text-center folder-margin-top-small folder-shadow-text"
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