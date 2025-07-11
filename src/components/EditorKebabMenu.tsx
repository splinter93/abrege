import React, { useEffect, useRef } from 'react';
import { FiShare2, FiDownload, FiCheck } from 'react-icons/fi';

interface EditorKebabMenuProps {
  open: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  wideMode: boolean;
  setWideMode: (v: boolean) => void;
  a4Mode: boolean;
  setA4Mode: (v: boolean) => void;
  autosaveOn: boolean;
  setAutosaveOn: (v: boolean) => void;
  slashLang: 'fr' | 'en';
  setSlashLang: (lang: 'fr' | 'en') => void;
}

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  outline: 'none',
  textAlign: 'left',
  fontSize: 15,
  color: 'var(--text-primary, #e5e7eb)',
  padding: '9px 20px 9px 20px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 8,
  transition: 'background 0.15s, color 0.15s',
};
const menuDividerStyle: React.CSSProperties = {
  height: 1,
  background: '#4446',
  margin: '6px 0',
  width: '90%',
  alignSelf: 'center',
  borderRadius: 1,
};

const EditorKebabMenu: React.FC<EditorKebabMenuProps> = ({
  open,
  position,
  onClose,
  wideMode,
  setWideMode,
  a4Mode,
  setA4Mode,
  autosaveOn,
  setAutosaveOn,
  slashLang,
  setSlashLang,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose]);

  // Hover style injection (même logique qu'avant)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const styleId = 'kebab-menu-hover-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .kebab-menu-popover button:hover {
            background: rgba(255,255,255,0.07) !important;
            color: #fff !important;
            transition: background 0.18s, color 0.18s;
          }
          .kebab-menu-popover button:active {
            background: rgba(255,255,255,0.13) !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="kebab-menu-popover"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        minWidth: 210,
        background: 'var(--bg-main, #18181c)',
        border: '1px solid #4446',
        borderRadius: 14,
        boxShadow: '0 6px 32px 0 rgba(0,0,0,0.16)',
        zIndex: 99999,
        padding: '10px 0',
        animation: 'fadeInMenu 0.18s',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <button style={menuItemStyle} onClick={() => { onClose(); /* TODO: implémenter partage */ }}>
        <FiShare2 style={{ marginRight: 10, opacity: 0.8 }} /> Partager
      </button>
      <button style={menuItemStyle} onClick={() => { onClose(); /* TODO: implémenter export */ }}>
        <FiDownload style={{ marginRight: 10, opacity: 0.8 }} /> Exporter
      </button>
      <div style={menuDividerStyle} />
      <button style={menuItemStyle} onClick={() => setWideMode(!wideMode)}>
        <span style={{ marginRight: 10 }}>{wideMode ? <FiCheck /> : <span style={{ display: 'inline-block', width: 16 }} />}</span>
        Mode large
      </button>
      <button style={menuItemStyle} onClick={() => setA4Mode(false)}>
        <span style={{ marginRight: 10 }}>{!a4Mode ? <FiCheck /> : <span style={{ display: 'inline-block', width: 16 }} />}</span>
        Creative Mode
      </button>
      <button style={menuItemStyle} onClick={() => setA4Mode(true)}>
        <span style={{ marginRight: 10 }}>{a4Mode ? <FiCheck /> : <span style={{ display: 'inline-block', width: 16 }} />}</span>
        A4 Mode
      </button>
      <button style={menuItemStyle} onClick={() => setAutosaveOn(!autosaveOn)}>
        <span style={{ marginRight: 10 }}>{autosaveOn ? <FiCheck /> : <span style={{ display: 'inline-block', width: 16 }} />}</span>
        Autosave {autosaveOn ? 'On' : 'Off'}
      </button>
      <div style={{ height: 1, background: '#4446', margin: '10px 0 4px 0', width: '90%', alignSelf: 'center', borderRadius: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '4px 0 2px 0' }}>
        <button
          style={{
            ...menuItemStyle,
            width: 48,
            padding: '6px 0',
            fontWeight: 700,
            color: slashLang === 'en' ? 'var(--accent-primary, #2994ff)' : 'var(--text-primary, #e5e7eb)',
            background: slashLang === 'en' ? 'rgba(41,148,255,0.08)' : 'none',
            border: slashLang === 'en' ? '1.5px solid var(--accent-primary, #2994ff)' : '1.5px solid transparent',
          }}
          onClick={() => setSlashLang('en')}
        >EN</button>
        <button
          style={{
            ...menuItemStyle,
            width: 48,
            padding: '6px 0',
            fontWeight: 700,
            color: slashLang === 'fr' ? 'var(--accent-primary, #2994ff)' : 'var(--text-primary, #e5e7eb)',
            background: slashLang === 'fr' ? 'rgba(41,148,255,0.08)' : 'none',
            border: slashLang === 'fr' ? '1.5px solid var(--accent-primary, #2994ff)' : '1.5px solid transparent',
          }}
          onClick={() => setSlashLang('fr')}
        >FR</button>
      </div>
    </div>
  );
};

export default EditorKebabMenu; 