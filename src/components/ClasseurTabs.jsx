'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DynamicIcon from './DynamicIcon';
import ContextMenu from './ContextMenu';
import ColorPalette from './ColorPalette';
import './ClasseurTabs.css';

// --- DND Kit Imports ---
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableTab = ({ classeur, isActive, onSelectClasseur, onContextMenu }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: classeur.id });
  const accentColor = '#e55a2c';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease',
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="motion-tab-wrapper">
      <button {...attributes} {...listeners} className={`classeur-tab ${isActive ? 'active' : ''}`} onClick={() => onSelectClasseur(classeur.id)} onContextMenu={(e) => onContextMenu(e, classeur)}>
        <DynamicIcon name={classeur.icon} color={isActive ? accentColor : classeur.color} size={16} />
        <span>{classeur.name}</span>
      </button>
    </div>
  );
};

const ClasseurTabs = ({
  classeurs,
  setClasseurs,
  activeClasseurId,
  onSelectClasseur,
  onCreateClasseur,
  onRenameClasseur,
  onDeleteClasseur,
  onUpdateClasseur,
  onUpdateClasseurPositions
}) => {
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
  const [isColorPickerVisible, setColorPickerVisible] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleContextMenu = (e, classeur) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item: classeur });
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };
  
  const handleRename = () => {
    if (contextMenu.item) {
        const newName = prompt('Nouveau nom du classeur :', contextMenu.item.name);
        if (newName && newName.trim() !== '') {
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
  
  const handleSelectColor = (color) => {
    if (contextMenu.item) {
        onUpdateClasseur(contextMenu.item.id, { color });
    }
    setColorPickerVisible(false);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = classeurs.findIndex((c) => c.id === active.id);
      const newIndex = classeurs.findIndex((c) => c.id === over.id);
      const reorderedClasseurs = arrayMove(classeurs, oldIndex, newIndex);
      
      setClasseurs(reorderedClasseurs); // Optimistic update
      
      const positionsToUpdate = reorderedClasseurs.map((c, index) => ({ id: c.id, position: index }));
      onUpdateClasseurPositions(positionsToUpdate);
    }
  };

  const contextMenuItems = [
    { label: 'Renommer', action: handleRename },
    { label: 'Changer la couleur', action: openColorPicker },
    { label: 'Supprimer', action: handleDelete },
  ];

  const activeClasseur = activeId ? classeurs.find(c => c.id === activeId) : null;

  return (
    <div className="classeur-tabs-glass-wrapper">
      <div className="classeur-tabs-btn-list">
        {classeurs.map((classeur) => (
          <button
            key={classeur.id}
            className={`classeur-btn-glass${classeur.id === activeClasseurId ? ' active' : ''}`}
            onClick={() => onSelectClasseur(classeur.id)}
            onContextMenu={(e) => handleContextMenu(e, classeur)}
          >
            <DynamicIcon name={classeur.icon} color={classeur.id === activeClasseurId ? '#ff6a00' : classeur.color} size={20} />
            <span>{classeur.name}</span>
          </button>
        ))}
        <button className="add-classeur-btn-glass" onClick={onCreateClasseur}>+</button>
      </div>
      {isColorPickerVisible && contextMenu.item && (
        <ColorPalette
          style={{ top: contextMenu.y + 10, left: contextMenu.x }}
          onSelectColor={handleSelectColor}
          onClose={() => setColorPickerVisible(false)}
        />
      )}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenuItems}
        onClose={closeContextMenu}
      />
    </div>
  );
};

export default ClasseurTabs; 