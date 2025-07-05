import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
}

export interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, visible, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = menuRef.current as HTMLDivElement | null;
      if (menu && !menu.contains(event.target as Node)) {
        onClose();
      }
    };
    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.action) {
      item.action();
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: `${y}px`, left: `${x}px` }}
    >
      <ul className="context-menu-list">
        {items.map((item, index) => {
          const typedItem = item as ContextMenuItem;
          return (
          <li
            key={index}
              className={`context-menu-item ${typedItem.separator ? 'separator' : ''}`}
              onClick={() => handleItemClick(typedItem)}
          >
              {!typedItem.separator && typedItem.label}
          </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ContextMenu; 