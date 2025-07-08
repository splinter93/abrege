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
  width: '100px !important',
  maxWidth: '100px !important',
  background: 'rgba(28,28,32,0.98)',
  border: '1px solid rgba(255,140,0,0.10)',
  borderRadius: 8,
  boxShadow: '0 6px 24px 0 rgba(0,0,0,0.15)',
  padding: '4px 0',
  color: '#fff',
  fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
  fontSize: 14,
  userSelect: 'none',
  animation: 'fadeInMenu 0.13s',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

const itemStyle: React.CSSProperties = {
  padding: '6px 18px 6px 14px',
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  width: '100%',
  textAlign: 'left',
  fontSize: 14,
  borderRadius: 4,
  transition: 'background 0.13s, color 0.13s',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block',
};

const itemHoverStyle: React.CSSProperties = {
  background: 'rgba(255,140,0,0.18)',
  color: '#ff9800',
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
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default SimpleContextMenu;