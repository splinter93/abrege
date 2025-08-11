"use client";
import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import SimpleContextMenu from "./SimpleContextMenu";
import ColorPalette from "./ColorPalette";
import "./ClasseurTabs.css";
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
  isDragging?: boolean;
  isOverlay?: boolean;
}

function SortableTab({ classeur, isActive, onSelectClasseur, onContextMenu, isDragging, isOverlay }: SortableTabProps) {
  const sortable = useSortable({ id: classeur.id });
  const droppable = useDroppable({ id: classeur.id });
  const isOverlayMode = !!isOverlay;
  
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
        sortable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      className={`motion-tab-wrapper${(sortable.isDragging || isOverlayMode) ? ' dragged' : ''}${(droppable.isOver && !sortable.isDragging) ? ' drag-over-target' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      style={{
        display: "inline-block",
        opacity: 1,
        zIndex: isOverlayMode ? 9999 : (isDragging || sortable.isDragging) ? 10 : "auto",
        pointerEvents: isOverlayMode ? "none" : undefined,
        background: "inherit",
      }}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <button
        className={`classeur-btn-glass${isActive ? " active" : ""}`}
        onClick={() => onSelectClasseur(classeur.id)}
        onContextMenu={(e) => onContextMenu(e, classeur)}
        style={{ fontFamily: "Inter, Noto Sans, Arial, sans-serif" }}
      >
        <span
          style={{ fontSize: 18, verticalAlign: "middle", cursor: "pointer", display: "inline-block" }}
          tabIndex={0}
          role="button"
          aria-label="Changer l'emoji"
        >
          {classeur.emoji && classeur.emoji.trim() !== "" ? classeur.emoji : "📁"}
        </span>
        <span className="classeur-name">{classeur.name}</span>
      </button>
    </div>
  );
}

interface ClasseurTabsProps {
  classeurs: Classeur[];
  setClasseurs: (classeurs: Classeur[]) => void;
  activeClasseurId: string | null;
  onSelectClasseur: (id: string) => void;
  onCreateClasseur: () => void;
  onRenameClasseur: (id: string, name: string) => void;
  onDeleteClasseur: (id: string) => void;
  onUpdateClasseur: (id: string, data: Partial<Classeur>) => void;
  onUpdateClasseurPositions: (positions: { id: string; position: number }[]) => void;
}

const ClasseurTabs: React.FC<ClasseurTabsProps> = ({
  classeurs,
  setClasseurs,
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

  useEffect(() => {
    console.debug('[EFFECT] useEffect triggered in ClasseurTabs (DnD Ready)', {});
  }, []);
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; item: Classeur | null }>({ visible: false, x: 0, y: 0, item: null });
  const [isColorPickerVisible, setColorPickerVisible] = useState(false);
  const [emojiPicker, setEmojiPicker] = useState<{ visible: boolean; classeur: Classeur | null }>({ visible: false, classeur: null });
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    console.debug('[EFFECT] useEffect triggered in ClasseurTabs (emojiPicker)', { emojiPicker });
    const handleClickOutside = (event: Event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setEmojiPicker({ ...emojiPicker, visible: false });
      }
    };
    if (emojiPicker.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiPicker]);

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>, classeur: Classeur) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item: classeur });
  };
  
  const closeContextMenu = () => setContextMenu({ ...contextMenu, visible: false });
  
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
  
  const openColorPicker = () => {
    setColorPickerVisible(true);
    setContextMenu({ ...contextMenu, visible: false });
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
  };

  // DnD Kit reorder logic - SANS EFFETS VISUELS
  const [draggedClasseur, setDraggedClasseur] = useState<Classeur | null>(null);
  const handleDragStart = (event: DragStartEvent) => {
    console.debug('Drag start', event);
    const id = event.active.id as string;
    const found = classeurs.find((c) => c.id === id) || null;
    setDraggedClasseur(found);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedClasseur(null);
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = classeurs.findIndex((c) => c.id === active.id);
      const newIndex = classeurs.findIndex((c) => c.id === over.id);
      const reorderedClasseurs = arrayMove(classeurs, oldIndex, newIndex);
      
      // Ne pas mettre à jour l'état local, laisser Zustand gérer via l'API
      const positionsToUpdate = reorderedClasseurs.map((c, index) => ({ id: c.id, position: index }));
      onUpdateClasseurPositions(positionsToUpdate);
    }
  };

  // Robustesse : toujours un tableau pour éviter les erreurs React #310
  const safeClasseurs = Array.isArray(classeurs) ? classeurs : [];

  return (
    <div className="classeur-tabs-glass-wrapper">
      <div className="classeur-tabs-btn-list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={safeClasseurs.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {safeClasseurs.map((classeur) => (
              <SortableTab
                key={classeur.id}
                classeur={classeur}
                isActive={activeClasseurId === classeur.id}
                onSelectClasseur={handleSelectClasseur}
                onContextMenu={handleContextMenu}
                isDragging={false}
                isOverlay={false}
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
                isDragging={true}
                isOverlay={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
        <button className="add-classeur-btn-glass" onClick={onCreateClasseur}>+</button>
      </div>
      {isColorPickerVisible && contextMenu.item && (
        <ColorPalette
          colors={['#e55a2c', '#2994ff', '#f5f5f5', '#a3a3a3', '#bdbdbd']}
          onSelect={handleSelectColor}
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
          { label: "Renommer", onClick: handleRename },
          { label: "Changer la couleur", onClick: openColorPicker },
          { label: "Supprimer", onClick: handleDelete },
        ]}
        onClose={closeContextMenu}
      />
      {emojiPicker.visible && emojiPicker.classeur && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(20,20,30,0.72)",
            zIndex: 4000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setEmojiPicker({ ...emojiPicker, visible: false })}
        >
          <div
            style={{
              background: "rgba(30,30,40,1)",
              border: "1.5px solid rgba(255,255,255,0.13)",
              borderRadius: 18,
              boxShadow: "0 8px 48px rgba(0,0,0,0.22)",
              padding: 32,
              maxWidth: 520,
              maxHeight: "70vh",
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 12,
              position: "relative",
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              style={{
                position: "absolute",
                top: 8,
                right: 12,
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: 22,
                cursor: "pointer",
                zIndex: 2,
              }}
              onClick={() => setEmojiPicker({ ...emojiPicker, visible: false })}
              aria-label="Fermer"
            >
              ✕
            </button>
            {COMMON_EMOJIS.map((emoji, index) => (
              <button
                key={index}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 8,
                  // Pas de transition pour interface simple
                }}
                onClick={() => {
                  if (emojiPicker.classeur) {
                    onUpdateClasseur(emojiPicker.classeur.id, { emoji });
                  }
                  setEmojiPicker({ ...emojiPicker, visible: false });
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
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

export default ClasseurTabs; 