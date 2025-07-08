import React from 'react';
import { Folder } from './types';
import FolderItem from './FolderItem';
import { useDragAndDrop } from './useDragAndDrop';

interface FolderListProps {
  folders: Folder[];
  onOpen: (folder: Folder) => void;
  onStartRenameClick: (folder: Folder) => void;
  onRename: (id: string, newName: string, type: 'folder' | 'file') => void;
  onCancelRename: () => void;
  renamingFolderId: string | null;
  onReorder: (folders: Folder[]) => void;
}

const FolderList: React.FC<FolderListProps> = ({ folders, onOpen, onStartRenameClick, onRename, onCancelRename, renamingFolderId, onReorder }) => {
  const { sensors, handleDragEnd, SortableContext, strategy } = useDragAndDrop<Folder>({
    items: folders,
    onReorder,
    getId: (folder) => folder.id,
  });

  return (
    <div className="folder-list">
      <SortableContext items={folders.map(f => f.id)} strategy={strategy}>
        {folders.map((folder) => (
          <div key={folder.id} className="draggable-folder" style={{ transition: 'box-shadow 0.2s', boxShadow: undefined, opacity: 1 }}>
            <FolderItem
              folder={folder}
              isRenaming={renamingFolderId === folder.id}
              onOpen={onOpen}
              onStartRenameClick={onStartRenameClick}
              onRename={(newName, type) => onRename(folder.id, newName, type)}
              onCancelRename={onCancelRename}
            />
          </div>
        ))}
      </SortableContext>
      {/* DnD context à l'extérieur pour englober toute la liste */}
      {/* Le DndContext doit être dans le composant parent (FolderManager) pour englober à la fois FolderList et FileList si besoin */}
    </div>
  );
};

export default FolderList; 