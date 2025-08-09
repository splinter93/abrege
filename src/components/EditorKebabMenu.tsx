import React, { useRef, useState, useEffect } from 'react';
import { FiShare2, FiDownload, FiCopy, FiMaximize2, FiMinimize2, FiGlobe, FiCheck } from 'react-icons/fi';
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
  slashLang,
  setSlashLang,
  published,
  setPublished,
  publishedUrl,
  fullWidth,
  setFullWidth,
  isPublishing = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);

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
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
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

  const translations = {
    fr: {
      share: 'Partager',
      export: 'Exporter',
      wideMode: 'Mode Large',
      a4Mode: 'Mode A4',
      published: 'Publié',
      publish: 'Publier',
      comingSoon: 'Bientôt'
    },
    en: {
      share: 'Share',
      export: 'Export',
      wideMode: 'Wide Mode',
      a4Mode: 'A4 Mode',
      published: 'Published',
      publish: 'Publish',
      comingSoon: 'Coming Soon'
    }
  } as const;

  const t = translations[slashLang];

  const menuOptions = [
    {
      id: 'share',
      label: t.share,
      icon: <FiShare2 size={18} />,
      onClick: () => { onClose(); },
      color: '#D4D4D4'
    },
    {
      id: 'export',
      label: t.export,
      icon: <FiDownload size={18} />,
      onClick: () => { onClose(); },
      color: '#D4D4D4'
    },
    {
      id: 'fullWidth',
      label: t.wideMode,
      icon: fullWidth ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />,
      onClick: () => { 
        setFullWidth(!fullWidth); 
        onClose(); 
      },
      color: fullWidth ? '#10b981' : '#D4D4D4'
    },
    {
      id: 'a4Mode',
      label: t.a4Mode,
      icon: <A4Icon />,
      onClick: () => { setA4Mode(!a4Mode); },
      color: a4Mode ? '#10b981' : '#D4D4D4',
      type: 'coming-soon' as const
    },
    {
      id: 'published',
      label: published ? t.published : t.publish,
      icon: <FiGlobe size={18} />,
      onClick: () => { 
        if (!isPublishing) {
          setPublished(!published); 
        }
      },
      color: published ? '#ff6b35' : '#D4D4D4',
      type: 'switch' as const,
      showCopyButton: published && publishedUrl,
      disabled: isPublishing
    }
  ] as const;

  return (
    <>
      {/* Overlay pour fermer le menu */}
      <div 
        className="editor-kebab-overlay"
        onClick={onClose}
        aria-label="Fermer le menu"
      />
      
      {/* Menu principal */}
      <div
        className="editor-header-kebab-menu"
        ref={menuRef}
        style={{ top: position.top, left: position.left, position: 'fixed' }}
      >
        {menuOptions.map((opt) => (
                    <button
            key={opt.id}
            className="editor-header-kebab-menu-item"
            onClick={opt.onClick}
            disabled={(opt as any).disabled}
            aria-label={opt.label}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: (opt as any).color }}>
              {opt.icon}
              {opt.label}
            </span>
            {opt.id === 'published' && publishedUrl && (
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <button
                  className="editor-header-kebab-menu-item"
                  style={{ padding: '0.4rem 0.6rem' }}
                  onClick={(e) => { e.stopPropagation(); handleCopyUrl(); }}
                >
                  {copyConfirmed ? <FiCheck size={16} /> : <FiCopy size={16} />}
                  </button>
                  </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
};

export default EditorKebabMenu; 