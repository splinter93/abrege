import React from 'react';
import { motion } from 'framer-motion';

import { Folder } from './types';
import { FolderIcon } from './CustomIcons';
import { folderItemVariants, folderItemTransition } from './FolderAnimation';

interface FolderItemProps {
  folder: Folder;
  onOpen: (folder: Folder) => void;
  isRenaming?: boolean;
  onRename?: (newName: string, type: 'folder' | 'file') => void;
  onCancelRename?: () => void;
  onContextMenu?: (e: React.MouseEvent, folder: Folder) => void;
  onDropItem?: (itemId: string, itemType: 'folder' | 'file') => void;
  onStartRenameClick?: (folder: Folder) => void;
}

const FolderItem: React.FC<FolderItemProps> = ({ folder, onOpen, isRenaming, onRename, onCancelRename, onContextMenu, onDropItem, onStartRenameClick }) => {
  const [inputValue, setInputValue] = React.useState(folder.name);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isDraggable, setIsDraggable] = React.useState(false);
  const lastWasRightClick = React.useRef(false);

  React.useEffect(() => {
    if (isRenaming) {
      setInputValue(folder.name);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isRenaming, folder.name]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onRename) {
      if (inputValue.trim() && inputValue !== folder.name) {
        onRename(inputValue.trim(), 'folder');
      } else if (onCancelRename) {
        onCancelRename();
      }
    } else if (e.key === 'Escape' && onCancelRename) {
      onCancelRename();
    }
  };

  const handleInputBlur = () => {
    if (onRename && inputValue.trim() && inputValue !== folder.name) {
      onRename(inputValue.trim(), 'folder');
    } else if (onCancelRename) {
      onCancelRename();
    }
  };

  return (
    <motion.div
      className={`fm-grid-item ${isDragOver ? ' drag-over' : ''}`}
      variants={folderItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={folderItemTransition}
    >
      <div
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
            onOpen(folder);
          }
          lastWasRightClick.current = false;
        }}
        onContextMenu={e => {
          e.preventDefault();
          if (onContextMenu) {
            onContextMenu(e, folder);
          }
          setIsDraggable(!isRenaming);
          lastWasRightClick.current = false;
        }}
        tabIndex={0}
        role="button"
        aria-label={folder.name}
        draggable={isDraggable}
        onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
          if (e.button !== 0) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData('itemId', folder.id);
          e.dataTransfer.setData('itemType', 'folder');
          e.dataTransfer.setData('application/json', JSON.stringify({ id: folder.id, type: 'folder' }));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setIsDragOver(true);
        }}
        onDragLeave={() => {
          setIsDragOver(false);
        }}
        onDrop={(e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data && data.target === 'tab') return; // Ignore drop venant d'un tab
          } catch {}
          if (onDropItem) {
            const itemId = e.dataTransfer.getData('itemId');
            const itemType = e.dataTransfer.getData('itemType') as 'folder' | 'file';
            if (itemId && itemType) {
              onDropItem(itemId, itemType);
            }
          }
        }}
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}
      >
              <FolderIcon size={60} />
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
                onStartRenameClick(folder);
              }
            }}
          >{folder.name}</span>
        )}
      </div>
    </motion.div>
  );
};

export default FolderItem; 