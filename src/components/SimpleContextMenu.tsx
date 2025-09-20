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

// Styles maintenant définis dans SimpleContextMenu.css

const SimpleContextMenu: React.FC<SimpleContextMenuProps> = ({ x, y, visible, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = React.useState<number | null>(null);

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
      {/* Effet de gradient glassmorphique */}
      <div className="context-menu-gradient" />
      
      {options.map((opt, i) => (
        <button
          key={i}
          className="context-menu-item"
          onClick={() => { opt.onClick(); onClose(); }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <span className="context-menu-item-text">
            {opt.label}
          </span>
        </button>
      ))}
    </div>,
    document.body
  );
};

export default SimpleContextMenu;