import React from 'react';
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

  const info = file.updated_at ? new Date(file.updated_at).toLocaleDateString() : file.source_type;
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
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
        className="file-square-container"
        style={{
          width: 168,
          height: 132,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          cursor: isRenaming ? 'text' : 'pointer',
          userSelect: 'none',
          transition: 'box-shadow 0.15s, background 0.18s, border 0.18s',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.border = '1.5px solid var(--accent-primary)';
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(255,106,0,0.13), 0 2px 8px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }}
        onMouseDown={e => {
          console.log('[DEBUG] FileItem onMouseDown - button:', e.button, 'isRenaming:', isRenaming);
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
          console.log('[DEBUG] FileItem onContextMenu');
          if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, file);
          }
          setIsDraggable(!isRenaming);
          lastWasRightClick.current = false;
        }}
      >
        <FileIcon size={64} className="mb-1" />
        {isRenaming ? (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            style={{
              fontWeight: 500,
              fontSize: 15,
              color: '#fff',
              textAlign: 'center',
              marginTop: 2,
              maxWidth: 140,
              background: 'rgba(0,0,0,0.18)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 6,
              outline: 'none',
              padding: '2px 8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
              textShadow: '0 1px 4px rgba(0,0,0,0.18)',
            }}
            autoFocus
            spellCheck={false}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            style={{ fontWeight: 500, fontSize: 15, color: '#fff', textAlign: 'center', marginTop: 2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.18)' }}
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