import React, { useEffect, useRef } from 'react';
import { FiShare2, FiDownload, FiCopy, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import './editor-kebab-menu.css';

interface EditorKebabMenuProps {
  open: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  a4Mode: boolean;
  setA4Mode: (v: boolean) => void;
  slashLang: 'fr' | 'en';
  setSlashLang: (lang: 'fr' | 'en') => void;
  published: boolean;
  setPublished: (v: boolean) => void;
  publishedUrl?: string;
  fullWidth: boolean;
  setFullWidth: (v: boolean) => void;
  isPublishing?: boolean;
}

const EditorKebabMenu: React.FC<EditorKebabMenuProps> = ({
  open,
  position,
  onClose,
  a4Mode,
  setA4Mode,
  published,
  setPublished,
  publishedUrl,
  fullWidth,
  setFullWidth,
  isPublishing = false,
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

  const handleCopyUrl = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      // TODO: Ajouter un toast de confirmation
    }
  };

  // Icône feuille SVG pour A4 Mode
  const A4Icon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

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
      id: 'a4Mode',
      label: 'A4 Mode',
      icon: <A4Icon />,
      onClick: () => { setA4Mode(!a4Mode); },
      color: a4Mode ? '#10b981' : '#D4D4D4'
    },
    {
      id: 'published',
      label: 'Published',
      onClick: () => { 
        // Éviter la boucle infinie en désactivant pendant la publication
        if (!isPublishing) {
          setPublished(!published); 
        }
      },
      color: published ? '#10b981' : '#D4D4D4',
      type: 'switch' as const,
      showCopyButton: published && publishedUrl,
      disabled: isPublishing
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
            {option.type === 'switch' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {option.icon}
                  <span style={{ color: option.color, fontSize: '14px', fontFamily: 'Noto Sans, Inter, Arial, sans-serif' }}>
                    {option.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Switch toggle */}
                  <button
                    onClick={option.onClick}
                    disabled={option.disabled}
                    style={{
                      width: 44,
                      height: 24,
                      background: (option.id === 'a4Mode' ? a4Mode : published) ? '#10b981' : '#444',
                      border: 'none',
                      borderRadius: 12,
                      cursor: option.disabled ? 'not-allowed' : 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      opacity: option.disabled ? 0.5 : 1
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        background: '#fff',
                        borderRadius: '50%',
                        transition: 'transform 0.2s ease',
                        transform: (option.id === 'a4Mode' ? a4Mode : published) ? 'translateX(20px)' : 'translateX(0px)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    />
                  </button>
                  {/* Bouton copier URL (seulement pour Published) */}
                  {option.showCopyButton && (
                    <button
                      onClick={handleCopyUrl}
                      style={{
                        padding: '6px',
                        background: 'transparent',
                        border: 'none',
                        color: '#D4D4D4',
                        cursor: 'pointer',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2a2a2c';
                        e.currentTarget.style.color = '#10b981';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#D4D4D4';
                      }}
                      title="Copier l'URL"
                    >
                      <FiCopy size={14} />
                    </button>
                  )}
                </div>
              </div>
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