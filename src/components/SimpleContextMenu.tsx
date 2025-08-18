import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface SimpleContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  options: { label: string; onClick: () => void }[];
  onClose: () => void;
}

const menuStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 2000,
  minWidth: '120px',
  background: 'rgba(30,30,35,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  padding: '6px 0',
  color: '#fff',
  fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
  fontSize: 13,
  fontWeight: 400,
  userSelect: 'none',
  animation: 'fadeInMenu 0.15s ease-out',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const itemStyle: React.CSSProperties = {
  padding: '8px 16px',
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  width: '100%',
  textAlign: 'left',
  fontSize: 13,
  fontWeight: 400,
  borderRadius: 6,
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block',
  color: 'rgba(255,255,255,0.9)',
};

const itemHoverStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
};

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
    <div ref={menuRef} style={{ ...menuStyle, top: y, left: x }}>
      {options.map((opt, i) => (
        <button
          key={i}
          style={hovered === i ? { ...itemStyle, ...itemHoverStyle } : itemStyle}
          onClick={() => { opt.onClick(); onClose(); }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {opt.label}
          </span>
        </button>
      ))}
      <style>{`
        @keyframes fadeInMenu {
          from { 
            opacity: 0; 
            transform: scale(0.95) translateY(-2px); 
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default SimpleContextMenu;