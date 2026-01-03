import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiTrash2, FiClipboard } from 'react-icons/fi';

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAction: (action: string) => void;
  nodeType?: string;
  hasSelection?: boolean;
}

interface MenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  onAction,
  nodeType = 'paragraph',
  hasSelection = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Actions disponibles selon le type de nœud
  const getActions = useCallback((): MenuAction[] => {
    // ✅ Actions : Coller et Supprimer
    return [
      {
        id: 'paste',
        label: 'Coller',
        icon: <FiClipboard size={16} />,
        shortcut: undefined,
        danger: false
      },
      {
        id: 'delete',
        label: 'Supprimer',
        icon: <FiTrash2 size={16} />,
        shortcut: undefined,
        danger: true
      }
    ];
  }, []);

  const actions = getActions();

  // Gestion des raccourcis clavier
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % actions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + actions.length) % actions.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (actions[selectedIndex] && !actions[selectedIndex].disabled) {
            onAction(actions[selectedIndex].id);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, actions, selectedIndex, onAction, onClose]);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Positionner le menu dans la viewport
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Ajuster horizontalement
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }

    // Ajuster verticalement
    if (y + rect.height > viewportHeight) {
      y = position.y - rect.height;
    }

    setAdjustedPosition({ x: Math.max(10, x), y: Math.max(10, y) });
  }, [isOpen, position]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        zIndex: 1000
      }}
    >
      <div className="context-menu-content">
        {actions.map((action, index) => (
          <button
            key={action.id}
            className={`context-menu-item ${index === selectedIndex ? 'selected' : ''} ${action.danger ? 'danger' : ''}`}
            onClick={() => {
              if (!action.disabled) {
                onAction(action.id);
              }
            }}
            disabled={action.disabled}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {action.icon && (
              <div className="context-menu-item-icon">
                {action.icon}
              </div>
            )}
            <span className="context-menu-item-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default ContextMenu;
