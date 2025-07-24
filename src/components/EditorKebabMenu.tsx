import React, { useEffect, useRef } from 'react';
import { FiShare2, FiDownload, FiCopy, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import './editor-kebab-menu.css';

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
  published: boolean;
  setPublished: (v: boolean) => void;
  publishedUrl?: string;
  fullWidth: boolean;
  setFullWidth: (v: boolean) => void;
}

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
  published,
  setPublished,
  publishedUrl,
  fullWidth,
  setFullWidth,
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

  if (!open) return null;

  const menuOptions = [
    {
      id: 'share',
      label: 'Partager',
      icon: <FiShare2 size={18} />,
      onClick: () => { onClose(); /* TODO: implémenter partage */ },
      color: '#D4D4D4'
    },
    {
      id: 'export',
      label: 'Exporter',
      icon: <FiDownload size={18} />,
      onClick: () => { onClose(); /* TODO: implémenter export */ },
      color: '#D4D4D4'
    },
    {
      id: 'fullWidth',
      label: 'Pleine largeur',
      icon: fullWidth ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />,
      onClick: () => { 
        setFullWidth(!fullWidth); 
        onClose(); 
      },
      color: fullWidth ? '#10b981' : '#D4D4D4'
    },
    {
      id: 'autosave',
      label: 'Autosave',
      onClick: () => { setAutosaveOn(!autosaveOn); },
      color: autosaveOn ? '#10b981' : '#D4D4D4',
      type: 'toggle' as const
    },
    {
      id: 'wideMode',
      label: 'Wide Mode',
      onClick: () => { setWideMode(!wideMode); },
      color: wideMode ? '#10b981' : '#D4D4D4',
      type: 'toggle' as const
    },
    {
      id: 'a4Mode',
      label: 'A4 Mode',
      onClick: () => { setA4Mode(!a4Mode); },
      color: a4Mode ? '#10b981' : '#D4D4D4',
      type: 'toggle' as const
    },
    {
      id: 'published',
      label: 'Published',
      onClick: () => { setPublished(!published); },
      color: published ? '#10b981' : '#D4D4D4',
      type: 'toggle' as const
    }
  ];

  return (
    <>
      {/* Overlay pour fermer le menu */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999
        }}
        onClick={onClose}
      />
      
      {/* Menu kebab */}
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          background: '#1a1a1c',
          border: '1px solid #2a2a2c',
          borderRadius: 12,
          padding: '6px 0',
          minWidth: 200,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}
      >
        {menuOptions.map((option, index) => (
          <div key={option.id}>
            {option.type === 'toggle' ? (
              <button
                onClick={option.onClick}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: option.color,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
                  borderRadius: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {option.label}
              </button>
            ) : (
              <button
                onClick={option.onClick}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  color: option.color,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
                  borderRadius: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {option.icon}
                {option.label}
              </button>
            )}
            
            {/* Séparateur élégant entre les options (sauf pour la dernière) */}
            {index < menuOptions.length - 1 && (
              <div
                style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent 0%, #2a2a2c 20%, #2a2a2c 80%, transparent 100%)',
                  margin: '0 16px',
                  opacity: 0.6
                }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default EditorKebabMenu; 