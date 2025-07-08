import React from 'react';
import { FileArticle } from './types';
import FileItem from './FileItem';
import { useDragAndDrop } from './useDragAndDrop';

interface FileListProps {
  files: FileArticle[];
  onDoubleClick: (file: FileArticle) => void;
  onStartRename: (file: FileArticle) => void;
  onRename: (id: string, newName: string) => void;
  onCancelRename: () => void;
  renamingFileId: string | null;
  onReorderFile: (files: FileArticle[]) => void;
}

const FileList: React.FC<FileListProps> = ({ files, onDoubleClick, onStartRename, onRename, onCancelRename, renamingFileId, onReorderFile }) => {
  const { sensors, handleDragEnd, SortableContext, strategy } = useDragAndDrop<FileArticle>({
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
              onDoubleClick={onDoubleClick}
              onStartRename={onStartRename}
              onRename={onRename}
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