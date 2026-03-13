import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RenameInput from '@/components/RenameInput';
import type { Classeur } from '@/store/useFileSystemStore';

interface SortableClasseurItemProps {
  classeur: Classeur;
  isActive?: boolean;
  isDragOver?: boolean;
  isRenaming?: boolean;
  onSelect?: (classeurId: string) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>, classeur: Classeur) => void;
  onDragOver?: (event: React.DragEvent<HTMLButtonElement>, classeur: Classeur) => void;
  onDragLeave?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLButtonElement>, classeur: Classeur) => void;
  onRenameSubmit?: (name: string) => void;
  onRenameCancel?: () => void;
}

const SortableClasseurItem: React.FC<SortableClasseurItemProps> = ({
  classeur,
  isActive,
  isDragOver,
  isRenaming,
  onSelect,
  onContextMenu,
  onDragOver,
  onDragLeave,
  onDrop,
  onRenameSubmit,
  onRenameCancel,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: classeur.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`classeur-pill ${isActive ? 'active' : ''} ${isDragOver ? 'drag-over' : ''} ${isRenaming ? 'is-renaming' : ''}`}
      onDragOver={(e) => onDragOver?.(e, classeur)}
      onDragLeave={(e) => onDragLeave?.(e)}
      onDrop={(e) => onDrop?.(e, classeur)}
      {...(isRenaming ? {} : attributes)}
      {...(isRenaming ? {} : listeners)}
    >
      {isRenaming && onRenameSubmit && onRenameCancel ? (
        <div className="classeur-pill-rename" onClick={(e) => e.stopPropagation()}>
          <span className="classeur-emoji">{classeur.emoji || '📁'}</span>
          <RenameInput
            initialValue={classeur.name}
            onSubmit={onRenameSubmit}
            onCancel={onRenameCancel}
            autoFocus
            variant="pill"
          />
        </div>
      ) : (
        <button
          type="button"
          className="classeur-pill-btn"
          onClick={() => onSelect?.(classeur.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu?.(e, classeur);
          }}
        >
          <span className="classeur-emoji">{classeur.emoji || '📁'}</span>
          <span className="classeur-name">{classeur.name}</span>
        </button>
      )}
    </div>
  );
};

export default SortableClasseurItem;

