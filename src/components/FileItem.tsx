import React from 'react';
import { FileArticle } from './types';
import { FileIcon } from './CustomIcons';

interface FileItemProps {
  file: FileArticle;
  onOpen: (file: FileArticle) => void;
  isRenaming?: boolean;
  onRename?: (newName: string) => void;
  onCancelRename?: () => void;
  onContextMenu?: (e: React.MouseEvent, file: FileArticle) => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, onOpen, isRenaming, onRename, onCancelRename, onContextMenu }) => {
  const [inputValue, setInputValue] = React.useState(file.source_title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isRenaming) {
      setInputValue(file.source_title);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isRenaming, file.source_title]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onRename) {
      if (inputValue.trim() && inputValue !== file.source_title) {
        onRename(inputValue.trim());
      } else if (onCancelRename) {
        onCancelRename();
      }
    } else if (e.key === 'Escape' && onCancelRename) {
      onCancelRename();
    }
  };

  const handleInputBlur = () => {
    if (onRename && inputValue.trim() && inputValue !== file.source_title) {
      onRename(inputValue.trim());
    } else if (onCancelRename) {
      onCancelRename();
    }
  };

  const info = file.updated_at ? new Date(file.updated_at).toLocaleDateString() : file.source_type;
  return (
    <div
      className="file-square-container"
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
      onDoubleClick={() => !isRenaming && onOpen(file)}
      tabIndex={0}
      role="button"
      aria-label={file.source_title}
      onContextMenu={e => { if (onContextMenu) { e.preventDefault(); onContextMenu(e, file); } }}
      draggable={!isRenaming}
      onDragStart={e => {
        e.dataTransfer.setData('itemId', file.id);
        e.dataTransfer.setData('itemType', 'file');
      }}
    >
      <FileIcon size={64} className="mb-1" />
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
        <span style={{ fontWeight: 500, fontSize: 15, color: '#fff', textAlign: 'center', marginTop: 2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.18)' }}>{file.source_title}</span>
      )}
    </div>
  );
};

export default FileItem; 