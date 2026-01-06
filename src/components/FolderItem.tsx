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
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const lastWasRightClick = React.useRef(false);

  React.useEffect(() => {
    if (isRenaming) {
      setInputValue(folder.name);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Sélectionner tout le texte pour permettre remplacement immédiat
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(0, length);
          // Ajuster la hauteur automatiquement
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
      }, 0);
    }
  }, [isRenaming, folder.name]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Ajuster la hauteur automatiquement
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter seul (sans Shift) pour valider le renommage
      // Shift+Enter permet le saut de ligne si besoin
      e.preventDefault();
      if (onRename && inputValue.trim() && inputValue !== folder.name) {
        onRename(inputValue.trim(), 'folder');
      } else if (onCancelRename) {
        onCancelRename();
      }
    } else if (e.key === 'Escape' && onCancelRename) {
      e.preventDefault();
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
      draggable={!isRenaming}
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        // Configuration simple du drag
        e.dataTransfer.setData('itemId', folder.id);
        e.dataTransfer.setData('itemType', 'folder');
        e.dataTransfer.setData('application/json', JSON.stringify({ id: folder.id, type: 'folder' }));
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <motion.div
        className={`fm-grid-item folder-item-wrapper ${isDragOver ? ' drag-over' : ''}`}
        variants={folderItemVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={folderItemTransition}
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
          lastWasRightClick.current = false;
        }}
        tabIndex={0}
        role="button"
        aria-label={folder.name}
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
          
          if (onDropItem) {
            const itemId = e.dataTransfer.getData('itemId');
            const itemType = e.dataTransfer.getData('itemType') as 'folder' | 'file';
            if (itemId && itemType) {
              onDropItem(itemId, itemType);
            }
          }
        }}
      >
        <div className="folder-icon">
          <FolderIcon size={36} />
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
                onStartRenameClick(folder);
              }
            }}
          >{folder.name}</span>
        )}
      </motion.div>
    </div>
  );
};

export default FolderItem; 