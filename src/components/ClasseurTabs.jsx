'use client';
import React, { useState, useRef, useEffect } from 'react';
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

const EMOJI_CHOICES = ['📁', '📄', '📚', '🗂️', '📝', '📒', '📦', '🧩', '📜', '📂'];

const ALL_EMOJIS = [
  ...'😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫😴😌😛😜😝🤤😒😓😔😕🙃🤑😲☹️🙁😖😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵😡😠🤬😷🤒🤕🤢🤮🤧😇🥳🥺🤠🤡🤥🤫🤭🧐🤓😈👿👹👺💀👻👽🤖💩😺😸😹😻😼😽🙀😿😾🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐽🐸🐵🙈🙉🙊🐒🐔🐧🐦🐤🐣🐥🦆🦅🦉🦇🐺🐗🐴🦄🐝🐛🦋🐌🐞🐜🦟🦗🕷️🕸️🐢🐍🦎🦂🦀🦞🦐🦑🐙🦑🦐🦞🦀🦋🐌🐛🐜🐝🦗🕷️🦂🦟🦠🐢🐍🦎🦖🦕🐙🦑🦐🦞🦀🐡🐠🐟🐬🐳🐋🦈🐊🐅🐆🦓🦍🦧🐘🦛🦏🐪🐫🦒🦘🦥🦦🦨🦡🐁🐀🐇🐿️🦔🐾🐉🐲🌵🎄🌲🌳🌴🌱🌿☘️🍀🎍🎋🍃🍂🍁🍄🌾💐🌷🌹🥀🌺🌸🌼🌻🌞🌝🌛🌜🌚🌕🌖🌗🌘🌑🌒🌓🌔🌙🌎🌍🌏💫⭐🌟✨⚡☄️💥🔥🌪️🌈☀️🌤️⛅🌥️🌦️🌧️🌨️🌩️🌪️🌫️🌬️🌀🌈🌂☂️☔⛱️⚽🏀🏈⚾🥎🎾🏐🏉🥏🎱🏓🏸🥅🏒🏑🏏⛳🏹🎣🥊🥋🎽⛸️🥌🛷⛷️🏂🏋️🤼🤸⛹️🤺🤾🏌️🏇🧘🏄🏊🤽🚣🧗🚵🚴🏆🥇🥈🥉🏅🎖️🏵️🎗️🎫🎟️🎪🤹🎭🎨🎬🎤🎧🎼🎹🥁🎷🎺🎸🎻🎲🎯🎳🎮🎰🎲🧩🧸🪁🪀🪅🪆🪐🪁🪀🪅🪆🪐🪁🪀🪅🪆🪐'.split('')
];

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
  const [emojiPicker, setEmojiPicker] = useState({ visible: false, classeur: null });
  const emojiPickerRef = useRef();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setEmojiPicker({ ...emojiPicker, visible: false });
      }
    }
    if (emojiPicker.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [emojiPicker]);

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={classeurs.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {classeurs.map((classeur) => (
              <div key={classeur.id} style={{ display: 'inline-block' }}>
                <button
                  className={`classeur-btn-glass${classeur.id === activeClasseurId ? ' active' : ''}`}
                  onClick={() => onSelectClasseur(classeur.id)}
                  onContextMenu={(e) => handleContextMenu(e, classeur)}
                  style={{ fontFamily: 'Inter, Noto Sans, Arial, sans-serif' }}
                  {...useSortable({ id: classeur.id }).attributes}
                  {...useSortable({ id: classeur.id }).listeners}
                  ref={useSortable({ id: classeur.id }).setNodeRef}
                >
                  <span
                    style={{ fontSize: 18, marginRight: 6, verticalAlign: 'middle', cursor: 'pointer', display: 'inline-block' }}
                    onClick={e => {
                      e.stopPropagation();
                      setEmojiPicker({ visible: true, classeur });
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Changer l'emoji"
                  >
                    {classeur.icon === 'FileText' ? '📄' : (classeur.icon && EMOJI_CHOICES.includes(classeur.icon) ? classeur.icon : '📁')}
                  </span>
                  <span style={{ fontFamily: 'inherit' }}>{classeur.name}</span>
                </button>
              </div>
            ))}
          </SortableContext>
        </DndContext>
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
      {emojiPicker.visible && emojiPicker.classeur && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(20,20,30,0.72)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setEmojiPicker({ ...emojiPicker, visible: false })}
        >
          <div
            style={{
              background: 'rgba(30,30,40,1)',
              border: '1.5px solid rgba(255,255,255,0.13)',
              borderRadius: 18,
              boxShadow: '0 8px 48px rgba(0,0,0,0.22)',
              padding: 32,
              maxWidth: 520,
              maxHeight: '70vh',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 12,
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute',
                top: 8,
                right: 12,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: 22,
                cursor: 'pointer',
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
                style={{ fontSize: 26, background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 7, transition: 'background 0.15s' }}
                onClick={() => {
                  onUpdateClasseur(emojiPicker.classeur.id, { icon: emoji });
                  setEmojiPicker({ ...emojiPicker, visible: false });
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