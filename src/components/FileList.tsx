import React from 'react';
import { FileArticle } from './types';
import FileItem from './FileItem';
import { useDragAndDrop } from './useDragAndDrop';

interface FileListProps {
  files: FileArticle[];
  onDoubleClick: (file: FileArticle) => void;
  onStartRenameClick: (file: FileArticle) => void;
  onRename: (id: string, newName: string, type: 'folder' | 'file') => void;
  onCancelRename: () => void;
  renamingFileId: string | null;
  onReorderFile: (files: FileArticle[]) => void;
}

const FileList: React.FC<FileListProps> = ({ files, onDoubleClick, onStartRenameClick, onRename, onCancelRename, renamingFileId, onReorderFile }) => {
  const { SortableContext, strategy } = useDragAndDrop<FileArticle>({
    items: files,
    onReorder: onReorderFile,
    getId: (file) => file.id,
  });

  return (
    <div className="file-list">
      <SortableContext items={files.map(f => f.id)} strategy={strategy}>
        {files.map((file) => (
          <div key={file.id} className="draggable-file" style={{ transition: 'box-shadow 0.2s', opacity: 0.6 }}>
            <FileItem
              file={file}
              isRenaming={renamingFileId === file.id}
              onOpen={onDoubleClick}
              onStartRenameClick={onStartRenameClick}
              onRename={(newName, type) => onRename(file.id, newName, type)}
              onCancelRename={onCancelRename}
            />
          </div>
        ))}
      </SortableContext>
      {/* DnD context à l'extérieur pour englober toute la liste */}
    </div>
  );
};

export default FileList; 