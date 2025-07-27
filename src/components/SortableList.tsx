import React from 'react';
import { Folder, FileArticle } from './types';
import FolderItem from './FolderItem';
import FileItem from './FileItem';
import './SortableList.css';

interface SortableListProps {
  items: (Folder | FileArticle)[];
  viewMode: 'list' | 'grid';
  onRename: (id: string, type: 'folder' | 'file', newName: string) => Promise<void>;
  renamingItemId: string | null;
  onCancelRename: () => void;
  handleContextMenu: (e: React.MouseEvent, item: Folder | FileArticle) => void;
  handleItemClick: (item: Folder | FileArticle) => void;
}

const SortableList: React.FC<SortableListProps> = ({ items, viewMode, onRename, renamingItemId, onCancelRename, handleContextMenu, handleItemClick }) => {
  return (
    <div className={viewMode === 'grid' ? 'sortable-list-grid' : 'sortable-list-flex'}>
      {items.map((item: Folder | FileArticle) => (
        'type' in item && item.type === 'folder' ? (
          <FolderItem
            key={item.id}
            folder={item as Folder}
            onOpen={() => handleItemClick(item)}
            isRenaming={item.id === renamingItemId}
            onRename={newName => onRename(item.id, 'folder', newName)}
            onCancelRename={onCancelRename}
            onContextMenu={(e, folder) => handleContextMenu(e, folder)}
          />
        ) : (
          <FileItem
            key={item.id}
            file={item as FileArticle}
            onOpen={() => handleItemClick(item)}
            isRenaming={item.id === renamingItemId}
            onRename={newName => onRename(item.id, 'file', newName)}
            onCancelRename={onCancelRename}
            onContextMenu={(e, file) => handleContextMenu(e, file)}
          />
        )
      ))}
    </div>
  );
};

export default SortableList; 