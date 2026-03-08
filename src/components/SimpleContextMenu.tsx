import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './SimpleContextMenu.css';

interface SimpleContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  options: { label: string; onClick: () => void }[];
  onClose: () => void;
}

const SimpleContextMenu: React.FC<SimpleContextMenuProps> = ({ x, y, visible, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [visible, onClose]);

  if (!visible) return null;
  return createPortal(
    <div
      ref={menuRef}
      className="context-menu-container"
      style={{ top: y, left: x }}
    >
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          className="context-menu-item"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            opt.onClick();
            onClose();
          }}
        >
          <span className="context-menu-item-text">{opt.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
};

export default SimpleContextMenu;
