import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  FiCopy, 
  FiTrash2, 
  FiEdit3, 
  FiMove, 
  FiMoreHorizontal,
  FiType,
  FiList,
  FiMessageSquare,
  FiCode,
  FiImage,
  FiGrid,
  FiMinus
} from 'react-icons/fi';

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
    const baseActions: MenuAction[] = [
      {
        id: 'duplicate',
        label: 'Dupliquer',
        icon: <FiCopy size={16} />,
        shortcut: 'Ctrl+D'
      },
      {
        id: 'delete',
        label: 'Supprimer',
        icon: <FiTrash2 size={16} />,
        shortcut: 'Delete',
        danger: true
      }
    ];

    // Actions de transformation selon le type de nœud
    const transformActions: MenuAction[] = [];
    
    if (nodeType !== 'heading') {
      transformActions.push(
        {
          id: 'turn-into-h1',
          label: 'Titre 1',
          icon: <FiType size={16} />,
          shortcut: 'Ctrl+1'
        },
        {
          id: 'turn-into-h2',
          label: 'Titre 2',
          icon: <FiType size={16} />,
          shortcut: 'Ctrl+2'
        },
        {
          id: 'turn-into-h3',
          label: 'Titre 3',
          icon: <FiType size={16} />,
          shortcut: 'Ctrl+3'
        }
      );
    }

    if (nodeType !== 'bulletList' && nodeType !== 'orderedList') {
      transformActions.push(
        {
          id: 'turn-into-bullet-list',
          label: 'Liste à puces',
          icon: <FiList size={16} />
        },
        {
          id: 'turn-into-ordered-list',
          label: 'Liste numérotée',
          icon: <FiList size={16} />
        }
      );
    }

    if (nodeType !== 'blockquote') {
      transformActions.push({
        id: 'turn-into-blockquote',
        label: 'Citation',
        icon: <FiMessageSquare size={16} />
      });
    }

    if (nodeType !== 'codeBlock') {
      transformActions.push({
        id: 'turn-into-code-block',
        label: 'Bloc de code',
        icon: <FiCode size={16} />
      });
    }

    if (nodeType !== 'image') {
      transformActions.push({
        id: 'turn-into-image',
        label: 'Image',
        icon: <FiImage size={16} />
      });
    }

    if (nodeType !== 'table') {
      transformActions.push({
        id: 'turn-into-table',
        label: 'Tableau',
        icon: <FiGrid size={16} />
      });
    }

    transformActions.push({
      id: 'turn-into-divider',
      label: 'Diviseur',
      icon: <FiMinus size={16} />
    });

    // ✅ Pour les note embeds, pas d'actions de transformation (nodes spéciaux)
    if (nodeType === 'noteEmbed') {
      return baseActions; // Seulement dupliquer et supprimer
    }

    return [...baseActions, ...transformActions];
  }, [nodeType]);

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
            <div className="context-menu-item-icon">
              {action.icon}
            </div>
            <div className="context-menu-item-content">
              <span className="context-menu-item-label">{action.label}</span>
              {action.shortcut && (
                <span className="context-menu-item-shortcut">{action.shortcut}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default ContextMenu;
