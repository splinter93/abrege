"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import SimpleContextMenu from "./SimpleContextMenu";
import ColorPalette from "./ColorPalette";
import "./ClasseurNavigation.css";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRouter } from 'next/navigation';

// Emojis optimisés - seulement les plus utilisés
const COMMON_EMOJIS = [
  "📁", "📚", "📝", "🎯", "💡", "🔍", "📊", "📈", "📉", "📋", 
  "📌", "📍", "🎨", "🎭", "🎪", "🎬", "🎤", "🎧", "🎼", "🎹",
  "🏠", "🏢", "🏫", "🏥", "🏪", "🏨", "🏰", "🏯", "🏛️", "⛪",
  "🌍", "🌎", "🌏", "🌐", "🌍", "🌎", "🌏", "🌐", "🌍", "🌎"
];

export interface Classeur {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  slug?: string;
}

interface SortableTabProps {
  classeur: Classeur;
  isActive: boolean;
  onSelectClasseur: (id: string) => void;
  onContextMenu: (e: React.MouseEvent<HTMLButtonElement>, classeur: Classeur) => void;
  isOverlay?: boolean;
}

function SortableTab({ classeur, isActive, onSelectClasseur, onContextMenu, isOverlay }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: classeur.id });
  const droppable = useDroppable({ id: classeur.id });
  
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isOverlay ? 9999 : isDragging ? 10 : "auto",
    pointerEvents: isOverlay ? "none" : undefined,
    display: "inline-block",
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.id && data.type) {
        window.dispatchEvent(new CustomEvent('drop-to-classeur', {
          detail: { classeurId: classeur.id, itemId: data.id, itemType: data.type }
        }));
      }
    } catch {}
  }, [classeur.id]);
  
  return (
    <div
      ref={node => {
        setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      className={`motion-tab-wrapper${isDragging ? ' dragged' : ''}${(droppable.isOver && !isDragging) ? ' drag-over-target' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      style={style}
      {...attributes}
      {...listeners}
    >
      <button
        className={`classeur-tab classeur-tab-button${isActive ? " active" : ""}`}
        onClick={() => onSelectClasseur(classeur.id)}
        onContextMenu={(e) => onContextMenu(e, classeur)}
      >
        <span
          className="classeur-emoji"
          tabIndex={0}
          role="button"
          aria-label="Changer l'emoji"
        >
          {classeur.emoji && classeur.emoji.trim() !== "" ? classeur.emoji : "📁"}
        </span>
        <span className="classeur-name-text">{classeur.name}</span>
      </button>
    </div>
  );
}

interface ClasseurNavigationProps {
  classeurs: Classeur[];
  activeClasseurId: string | null;
  onSelectClasseur: (id: string) => void;
  onCreateClasseur: () => void;
  onRenameClasseur: (id: string, name: string) => void;
  onDeleteClasseur: (id: string) => void;
  onUpdateClasseur: (id: string, data: Partial<Classeur>) => void;
  onUpdateClasseurPositions: (reorderedClasseurs: Classeur[]) => void;
}

const ClasseurNavigation: React.FC<ClasseurNavigationProps> = ({
  classeurs,
  activeClasseurId,
  onSelectClasseur,
  onCreateClasseur,
  onRenameClasseur,
  onDeleteClasseur,
  onUpdateClasseur,
  onUpdateClasseurPositions,
}) => {
  const router = useRouter();
  const deeplinks = process.env.NEXT_PUBLIC_DEEPLINKS === '1';
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; item: Classeur | null }>({ visible: false, x: 0, y: 0, item: null });
  const [isColorPickerVisible, setColorPickerVisible] = useState(false);
  const [emojiPicker, setEmojiPicker] = useState<{ visible: boolean; classeur: Classeur | null }>({ visible: false, classeur: null });
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.debug('[EFFECT] useEffect triggered in ClasseurTabs (DnD Ready)', {});
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setEmojiPicker({ visible: false, classeur: null });
      }
    };
    if (emojiPicker.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiPicker.visible]);

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>, classeur: Classeur) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item: classeur });
  };
  
  const closeContextMenu = () => setContextMenu({ ...contextMenu, visible: false });
  
  const handleOpen = () => {
    if (contextMenu.item) {
      handleSelectClasseur(contextMenu.item.id);
    }
    closeContextMenu();
  };
  
  const handleRename = () => {
    if (contextMenu.item) {
      const newName = prompt("Nouveau nom du classeur :", contextMenu.item.name);
      if (newName && newName.trim() !== "") {
        onRenameClasseur(contextMenu.item.id, newName.trim());
      }
    }
    closeContextMenu();
  };
  
  const handleDelete = () => {
    if (contextMenu.item) {
      if (window.confirm(`Voulez-vous vraiment supprimer le classeur "${contextMenu.item.name}" et tout son contenu ?`)) {
        onDeleteClasseur(contextMenu.item.id);
      }
    }
    closeContextMenu();
  };
  

  
  const handleSelectClasseur = (id: string) => {
    if (deeplinks) {
      const c = classeurs.find(x => x.id === id);
      const ref = (c?.slug && c.slug.trim() !== '') ? c.slug : id;
      // UX smooth: prefetch before push
      router.prefetch(`/private/classeur/${ref}`);
      router.push(`/private/classeur/${ref}`);
    } else {
      onSelectClasseur(id);
    }
  };

  const handleSelectColor = (color: string) => {
    if (contextMenu.item) {
      onUpdateClasseur(contextMenu.item.id, { color });
    }
    setColorPickerVisible(false);
    closeContextMenu();
  };

  const [draggedClasseur, setDraggedClasseur] = useState<Classeur | null>(null);
  
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const found = classeurs.find((c) => c.id === active.id) || null;
    setDraggedClasseur(found);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedClasseur(null);
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = classeurs.findIndex((c) => c.id === active.id);
      const newIndex = classeurs.findIndex((c) => c.id === over.id);
      const reorderedClasseurs = arrayMove(classeurs, oldIndex, newIndex);
      
      onUpdateClasseurPositions(reorderedClasseurs);
    }
  };

  // Robustesse : toujours un tableau pour éviter les erreurs React #310
  const safeClasseurs = Array.isArray(classeurs) ? classeurs : [];

  return (
    <div className="classeur-tabs-wrapper">
      <div className="classeur-tabs">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={safeClasseurs.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {safeClasseurs.map((classeur) => (
              <SortableTab
                key={classeur.id}
                classeur={classeur}
                isActive={activeClasseurId === classeur.id}
                onSelectClasseur={handleSelectClasseur}
                onContextMenu={handleContextMenu}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {draggedClasseur ? (
              <SortableTab
                classeur={draggedClasseur}
                isActive={draggedClasseur.id === activeClasseurId}
                onSelectClasseur={handleSelectClasseur}
                onContextMenu={handleContextMenu}
                isOverlay={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
        <button className="add-classeur-btn" onClick={onCreateClasseur}>+</button>
      </div>
      {isColorPickerVisible && contextMenu.item && (
        <ColorPalette
          colors={['#e55a2c', '#2994ff', '#f5f5f5', '#a3a3a3', '#bdbdbd']}
          onSelect={handleSelectColor}
          className="classeur-context-menu"
          style={{ top: contextMenu.y + 10, left: contextMenu.x }}
          onSelectColor={handleSelectColor}
          onClose={() => setColorPickerVisible(false)}
        />
      )}
      <SimpleContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        options={[
          { label: "Ouvrir", onClick: handleOpen },
          { label: "Renommer", onClick: handleRename },
          { label: "Supprimer", onClick: handleDelete },
        ]}
        onClose={closeContextMenu}
      />
      {emojiPicker.visible && emojiPicker.classeur && (
        <div
          className="classeur-emoji-picker-overlay"
          onClick={() => setEmojiPicker({ ...emojiPicker, visible: false })}
        >
          <div
            ref={emojiPickerRef}
            className="classeur-emoji-picker-container"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="classeur-emoji-picker-close"
              onClick={() => setEmojiPicker({ ...emojiPicker, visible: false })}
              aria-label="Fermer"
            >
              ✕
            </button>
            {COMMON_EMOJIS.map((emoji, index) => (
              <button
                key={index}
                className="classeur-emoji-option"
                onClick={() => {
                  if (emojiPicker.classeur) {
                    onUpdateClasseur(emojiPicker.classeur.id, { emoji });
                  }
                  setEmojiPicker({ visible: false, classeur: null });
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClasseurNavigation;
