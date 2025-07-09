"use client";
import React, { useState, useRef, useEffect, MouseEvent } from "react";
import { motion } from "framer-motion";
import DynamicIcon from "./DynamicIcon";
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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const EMOJI_CHOICES = ["📁", "📄", "📚", "🗂️", "📝", "📒", "📦", "🧩", "📜", "📂"];

const ALL_EMOJIS =
  "😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫😴😌😛😜😝🤤😒😓😔😕🙃🤑😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵😡😠🤬😷🤒🤕🤢🤮🤧😇🥳🥺🤠🤡🤥🤫🤭🧐🤓😈👿👹👺💀👻👽🤖💩😺😸😹😻😼😽🙀😿😾🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐽🐸🐵🙈🙉🙊🐒🐔🐧🐦🐤🐣🐥🦆🦅🦉🦇🐺🐗🐴🦄🐝🐛🦋🐌🐞🐜🦟🦗🕷️🕸️🐢🐍🦎🦂🦀🦞🦐🦑🐙🦑🦐🦞🦀🦋🐌🐛🐜🐝🦗🕷️🦂🦟🦠🐢🐍🦎🦖🦕🐙🦑🦐🦞🦀🐡🐠🐟🐬🐳🐋🦈🐊🐅🐆🦓🦍🦧🐘🦛🦏🐪🐫🦒🦘🦥🦦🦨🦡🐁🐀🐇🐿️🦔🐾🐉🐲🌵🎄🌲🌳🌴🌱🌿☘️🍀🎍🎋🍃🍂🍁🍄🌾💐🌷🌹🥀🌺🌸🌼🌻🌞🌝🌛🌜🌚🌕🌖🌗🌘🌑🌒🌓🌔🌙🌎🌍🌏💫⭐🌟✨⚡☄️💥🔥🌪️🌈☀️🌤️⛅🌥️🌦️🌧️🌨️🌩️🌪️🌫️🌬️🌀🌈🌂☂️☔⛱️⚽🏈⚾🥎🎾🏐🏉🥏🎱🏓🏸🥅🏒🏑🏏⛳🏹🎣🥊🥋🎽⛸️🥌🛷⛷️🏂🏋️🤼🤸⛹️🤺🤾🏌️🏇🧘🏄🏊🤽🚣🧗🚵🚴🏆🥇🥈🥉🏅🎖️🏵️🎗️🎫🎟️🎪🤹🎭🎨🎬🎤🎧🎼🎹🥁🎷🎺🎸🎻🎲🎯🎳🎮🎰🎲🧩🧸🪁🪀🪅🪆🪐🪁🪀🪅🪆🪐🪁🪀🪅🪆🪐".split("");

export interface Classeur {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface SortableTabProps {
  classeur: Classeur;
  isActive: boolean;
  onSelectClasseur: (id: string) => void;
  onContextMenu: (e: MouseEvent<HTMLButtonElement>, classeur: Classeur) => void;
  listeners?: any;
  attributes?: any;
  setNodeRef?: (el: HTMLElement | null) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
  sortableTransform?: any;
  sortableTransition?: any;
}

function SortableTab({ classeur, isActive, onSelectClasseur, onContextMenu, listeners, attributes, setNodeRef, isDragging, isOverlay, sortableTransform, sortableTransition }: SortableTabProps) {
  const accentColor = "#e55a2c";
  return (
    <div
      ref={setNodeRef}
      style={{
        display: "inline-block",
        opacity: isDragging && !isOverlay ? 0.4 : 1,
        zIndex: isDragging ? 10 : "auto",
        filter: isOverlay ? "drop-shadow(0 2px 12px rgba(255,255,255,0.27))" : undefined,
        transform: sortableTransform ? CSS.Transform.toString(sortableTransform) : isOverlay ? "scale(1.08)" : undefined,
        transition: sortableTransition || "opacity 0.18s, filter 0.18s, transform 0.18s",
      }}
      {...attributes}
      {...listeners}
    >
      <button
        className={`classeur-btn-glass${isActive ? " active" : ""}`}
        onClick={() => onSelectClasseur(classeur.id)}
        onContextMenu={e => onContextMenu(e, classeur)}
        style={{ fontFamily: "Inter, Noto Sans, Arial, sans-serif" }}
      >
        <span
          style={{ fontSize: 18, marginRight: 6, verticalAlign: "middle", cursor: "pointer", display: "inline-block" }}
          tabIndex={0}
          role="button"
          aria-label="Changer l'emoji"
        >
          {classeur.icon === "FileText" ? "📄" : classeur.icon && EMOJI_CHOICES.includes(classeur.icon) ? classeur.icon : "📁"}
        </span>
        <span style={{ fontFamily: "inherit" }}>{classeur.name}</span>
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
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; item: Classeur | null }>({ visible: false, x: 0, y: 0, item: null });
  const [isColorPickerVisible, setColorPickerVisible] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [emojiPicker, setEmojiPicker] = useState<{ visible: boolean; classeur: Classeur | null }>({ visible: false, classeur: null });
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
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
  const handleSelectColor = (color: string) => {
    if (contextMenu.item) {
      onUpdateClasseur(contextMenu.item.id, { color });
    }
    setColorPickerVisible(false);
  };

  // DnD Kit reorder logic
  const [draggedClasseur, setDraggedClasseur] = useState<Classeur | null>(null);
  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const found = classeurs.find((c) => c.id === id) || null;
    setDraggedClasseur(found);
    setActiveId(id);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setDraggedClasseur(null);
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = classeurs.findIndex((c) => c.id === active.id);
      const newIndex = classeurs.findIndex((c) => c.id === over.id);
      const reorderedClasseurs = arrayMove(classeurs, oldIndex, newIndex);
      setClasseurs(reorderedClasseurs);
      const positionsToUpdate = reorderedClasseurs.map((c, index) => ({ id: c.id, position: index }));
      onUpdateClasseurPositions(positionsToUpdate);
    }
  };

  return (
    <div className="classeur-tabs-glass-wrapper">
      <div className="classeur-tabs-btn-list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={classeurs.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {classeurs.map((classeur) => {
              const sortable = useSortable({ id: classeur.id });
              return (
                <SortableTab
                  key={classeur.id}
                  classeur={classeur}
                  isActive={classeur.id === activeClasseurId}
                  onSelectClasseur={onSelectClasseur}
                  onContextMenu={handleContextMenu}
                  listeners={sortable.listeners}
                  attributes={sortable.attributes}
                  setNodeRef={sortable.setNodeRef}
                  isDragging={activeId === classeur.id}
                  sortableTransform={sortable.transform}
                  sortableTransition={sortable.transition}
                />
              );
            })}
          </SortableContext>
          <DragOverlay>
            {draggedClasseur ? (
              <SortableTab
                classeur={draggedClasseur}
                isActive={draggedClasseur.id === activeClasseurId}
                onSelectClasseur={onSelectClasseur}
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
              ×
            </button>
            {ALL_EMOJIS.map(emoji => (
              <button
                key={emoji}
                style={{ fontSize: 26, background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: 7, transition: "background 0.15s" }}
                onClick={() => {
                  if (emojiPicker.classeur) {
                    onUpdateClasseur(emojiPicker.classeur.id, { icon: emoji });
                    setEmojiPicker({ ...emojiPicker, visible: false });
                  }
                }}
                aria-label={`Choisir ${emoji}`}
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