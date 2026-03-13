import React from 'react';
import { motion } from 'framer-motion';

import { Folder } from './types';
import { FolderIcon } from './CustomIcons';
import { folderItemVariants, folderItemTransition } from './FolderAnimation';
import RenameInput from './RenameInput';

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
  const [isDragOver, setIsDragOver] = React.useState(false);
  const lastWasRightClick = React.useRef(false);

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
        {isRenaming && onRename && onCancelRename ? (
          <div className="fm-rename-wrap" onClick={e => e.stopPropagation()}>
            <RenameInput
              initialValue={folder.name}
              onSubmit={(name) => onRename(name, 'folder')}
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