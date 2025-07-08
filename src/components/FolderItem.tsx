import React from 'react';
import { Folder } from './types';
import { FolderIcon } from './CustomIcons';

interface FolderItemProps {
  folder: Folder;
  onOpen: (folder: Folder) => void;
  isRenaming?: boolean;
  onRename?: (newName: string) => void;
  onCancelRename?: () => void;
  onContextMenu?: (e: React.MouseEvent, folder: Folder) => void;
  onDropItem?: (itemId: string, itemType: 'folder' | 'file') => void;
}

const FolderItem: React.FC<FolderItemProps> = ({ folder, onOpen, isRenaming, onRename, onCancelRename, onContextMenu, onDropItem }) => {
  const [inputValue, setInputValue] = React.useState(folder.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isRenaming) {
      setInputValue(folder.name);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isRenaming, folder.name]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onRename) {
      if (inputValue.trim() && inputValue !== folder.name) {
        onRename(inputValue.trim());
      } else if (onCancelRename) {
        onCancelRename();
      }
    } else if (e.key === 'Escape' && onCancelRename) {
      onCancelRename();
    }
  };

  const handleInputBlur = () => {
    if (onRename && inputValue.trim() && inputValue !== folder.name) {
      onRename(inputValue.trim());
    } else if (onCancelRename) {
      onCancelRename();
    }
  };

  return (
    <div
      className="folder-square-container"
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
        transition: 'box-shadow 0.15s',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onDoubleClick={() => !isRenaming && onOpen(folder)}
      tabIndex={0}
      role="button"
      aria-label={folder.name}
      onContextMenu={e => { if (onContextMenu) { e.preventDefault(); onContextMenu(e, folder); } }}
      draggable={!isRenaming}
      onDragStart={e => {
        e.dataTransfer.setData('itemId', folder.id);
        e.dataTransfer.setData('itemType', 'folder');
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
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
        <span style={{ fontWeight: 500, fontSize: 15, color: '#fff', textAlign: 'center', marginTop: 2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.18)' }}>{folder.name}</span>
      )}
    </div>
  );
};

export default FolderItem; 