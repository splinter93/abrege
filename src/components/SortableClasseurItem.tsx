import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Classeur } from '@/store/useFileSystemStore';

interface SortableClasseurItemProps {
  classeur: Classeur;
  isActive?: boolean;
  isDragOver?: boolean;
  onSelect?: (classeurId: string) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>, classeur: Classeur) => void;
  onDragOver?: (event: React.DragEvent<HTMLButtonElement>, classeur: Classeur) => void;
  onDragLeave?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLButtonElement>, classeur: Classeur) => void;
}

const SortableClasseurItem: React.FC<SortableClasseurItemProps> = ({
  classeur,
  isActive,
  isDragOver,
  onSelect,
  onContextMenu,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: classeur.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      className={`classeur-pill ${isActive ? 'active' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onClick={() => onSelect?.(classeur.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, classeur);
      }}
      onDragOver={(e) => onDragOver?.(e, classeur)}
      onDragLeave={(e) => onDragLeave?.(e)}
      onDrop={(e) => onDrop?.(e, classeur)}
      {...attributes}
      {...listeners}
    >
      <span className="classeur-emoji">{classeur.emoji || '📁'}</span>
      <span className="classeur-name">{classeur.name}</span>
    </button>
  );
};

export default SortableClasseurItem;

