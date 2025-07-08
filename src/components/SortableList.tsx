import React from 'react';
import { Folder, FileArticle } from './types';
import FolderItem from './FolderItem';
import FileItem from './FileItem';

interface SortableListProps {
  items: (Folder | FileArticle)[];
  viewMode: 'list' | 'grid';
  onRename: (id: string, type: 'folder' | 'file', newName: string) => Promise<void>;
  renamingItemId: string | null;
  onStartRename: (item: Folder | FileArticle) => void;
  onCancelRename: () => void;
  handleContextMenu: (e: React.MouseEvent, item: Folder | FileArticle) => void;
  handleItemClick: (item: Folder | FileArticle) => void;
  handleItemDoubleClick: (item: Folder | FileArticle) => void;
}

const SortableList: React.FC<SortableListProps> = ({ items, viewMode, onRename, renamingItemId, onStartRename, onCancelRename, handleContextMenu, handleItemClick, handleItemDoubleClick }) => {
  return (
    <div className={viewMode === 'grid' ? 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 p-2' : 'flex flex-col'}>
      {items.map((item: Folder | FileArticle) => (
        (item as any).type === 'folder' ? (
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