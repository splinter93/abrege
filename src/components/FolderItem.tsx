import React from 'react';
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
      className={`folder-square-container${isDragOver ? ' drag-over' : ''}`}
      style={{
        width: 168,
        height: 132,
        background: isDragOver ? 'rgba(255,140,0,0.10)' : 'rgba(255,255,255,0.025)',
        border: isDragOver ? '2px solid rgba(255,140,0,0.22)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isDragOver
          ? '0 0 0 1.2px rgba(255,140,0,0.18), 0 8px 32px 0 rgba(255,140,0,0.13), 0 2px 12px 0 rgba(31, 38, 135, 0.08)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        cursor: isRenaming ? 'text' : 'pointer',
        userSelect: 'none',
        transition: 'box-shadow 0.18s, background 0.18s, border 0.18s',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: isDragOver ? 2 : undefined,
      }}
      onMouseEnter={e => {
        if (!isDragOver) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.border = '1.5px solid var(--accent-primary)';
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(255,106,0,0.13), 0 2px 8px rgba(0,0,0,0.08)';
        }
      }}
      onMouseLeave={e => {
        if (!isDragOver) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }
      }}
      onMouseDown={e => {
        console.log('[DEBUG] FolderItem onMouseDown - button:', e.button, 'isRenaming:', isRenaming);
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
        console.log('[DEBUG] FolderItem onContextMenu');
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
        console.log('[DEBUG] FolderItem onDragStart - nativeEvent.button:', e.nativeEvent.button);
        if (e.nativeEvent.button !== 0) {
          e.preventDefault();
          console.log('[DEBUG] FolderItem onDragStart - prevented due to non-left click');
          return;
        }
        e.dataTransfer.setData('itemId', folder.id);
        e.dataTransfer.setData('itemType', 'folder');
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDragLeave={e => {
        setIsDragOver(false);
      }}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (onDropItem) {
          const itemId = e.dataTransfer.getData('itemId');
          const itemType = e.dataTransfer.getData('itemType') as 'folder' | 'file';
          console.log('[DND] FolderItem onDrop', { itemId, itemType, targetFolderId: folder.id });
          if (itemId && itemType) {
            onDropItem(itemId, itemType);
          }
        }
      }}
    >
      <FolderIcon size={64} className="mb-1" />
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
              onStartRenameClick(folder);
            }
          }}
        >{folder.name}</span>
      )}
    </div>
  );
};

export default FolderItem; 