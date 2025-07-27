import React from 'react';
import '@/styles/folder-manager-utilities.css';
import { Folder } from './types';
import { FolderIcon } from './CustomIcons';

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
    <div
      className={`folder-square-container folder-flex-column folder-text-center folder-cursor-pointer folder-transition-all ${isDragOver ? ' drag-over' : ''}`}
      onMouseEnter={e => {
        if (!isDragOver) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.18)';
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.08)';
        }
      }}
      onMouseLeave={() => {
        if (!isDragOver) {
          // Reset styles handled by CSS
        }
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
      onDragStart={e => {
        if (e.nativeEvent.button !== 0) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('itemId', folder.id);
        e.dataTransfer.setData('itemType', 'folder');
        e.dataTransfer.setData('application/json', JSON.stringify({ id: folder.id, type: 'folder' }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onDrop={e => {
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
    >
      <FolderIcon size={64} className="folder-margin-bottom-small" />
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
              onStartRenameClick(folder);
            }
          }}
        >{folder.name}</span>
      )}
    </div>
  );
};

export default FolderItem; 