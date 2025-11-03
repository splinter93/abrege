import React, { useRef, useState, useEffect } from 'react';
import { FiShare2, FiDownload, FiCopy, FiMaximize2, FiMinimize2, FiGlobe, FiCheck } from 'react-icons/fi';
import './editor-kebab-menu.css';
import ShareMenu from './ShareMenu';
import type { ShareSettings, ShareSettingsUpdate } from '@/types/sharing';
import { getDefaultShareSettings } from '@/types/sharing';

interface EditorKebabMenuProps {
  open: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  a4Mode: boolean;
  setA4Mode: (v: boolean) => void;
  slashLang: 'fr' | 'en';
  setSlashLang: (lang: 'fr' | 'en') => void;
  fullWidth: boolean;
  setFullWidth: (v: boolean) => void;
  showToolbar: boolean;
  toggleToolbar: () => void;
  noteId: string;
  currentShareSettings: ShareSettings;
  onShareSettingsChange: (settings: ShareSettingsUpdate) => Promise<void>;
  publicUrl?: string;
}

const EditorKebabMenu: React.FC<EditorKebabMenuProps> = ({
  open,
  position,
  onClose,
  a4Mode,
  setA4Mode,
  slashLang,
  setSlashLang,
  fullWidth,
  setFullWidth,
  showToolbar,
  toggleToolbar,
  noteId,
  currentShareSettings,
  onShareSettingsChange,
  publicUrl,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Si le ShareMenu est ouvert, ne pas fermer le menu kebab
      if (shareMenuOpen) {
        // Vérifier si le clic est dans le ShareMenu
        if (target.closest('.share-menu')) {
          return; // Clic dans le ShareMenu, ne rien faire
        }
        // Clic à l'extérieur du ShareMenu, fermer les deux
        onClose();
        setShareMenuOpen(false);
        return;
      }
      
      // ShareMenu fermé, logique normale
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setShareMenuOpen(false); // Fermer aussi le ShareMenu
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose, shareMenuOpen]);

  if (!open) return null;
  
  // Vérification de sécurité pour currentShareSettings
  if (!currentShareSettings) {
    console.warn('EditorKebabMenu: currentShareSettings is undefined, using default');
    // Utiliser des valeurs par défaut au lieu de retourner null
    const defaultSettings = getDefaultShareSettings();
    currentShareSettings = defaultSettings;
  }

  const handleCopyUrl = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
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
      toolbar: 'Toolbar',
      published: 'Publié',
      publish: 'Publier',
      comingSoon: 'Bientôt'
    },
    en: {
      share: 'Share',
      export: 'Export',
      wideMode: 'Wide Mode',
      a4Mode: 'A4 Mode',
      toolbar: 'Toolbar',
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
      onClick: () => { 
        setShareMenuOpen(true);
        // Ne pas fermer le menu kebab, le ShareMenu se superposera
      },
      color: currentShareSettings?.visibility === 'private' ? '#D4D4D4' : '#ff6b35',
      showCopyButton: currentShareSettings?.visibility !== 'private' && publicUrl,
    },
    {
      id: 'export',
      label: t.export,
      icon: <FiDownload size={18} />,
      onClick: () => { onClose(); },
      color: '#D4D4D4',
      showCopyButton: false,
    },
    {
      id: 'toolbar',
      label: t.toolbar,
      icon: showToolbar ? <FiCheck size={18} /> : null,
      onClick: () => { 
        toggleToolbar();
        onClose(); 
      },
      color: showToolbar ? '#10b981' : '#D4D4D4',
      showCopyButton: false,
    },
    {
      id: 'fullWidth',
      label: t.wideMode,
      icon: fullWidth ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />,
      onClick: () => { 
        setFullWidth(!fullWidth); 
        onClose(); 
      },
      color: fullWidth ? '#10b981' : '#D4D4D4',
      showCopyButton: false,
    },
    {
      id: 'a4Mode',
      label: t.a4Mode,
      icon: <A4Icon />,
      onClick: () => { setA4Mode(!a4Mode); },
      color: a4Mode ? '#10b981' : '#D4D4D4',
      type: 'coming-soon' as const,
      showCopyButton: false,
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
        style={{ 
          top: position.top, 
          left: position.left, 
          position: 'fixed',
          zIndex: shareMenuOpen ? 999 : 1000 // Plus bas que ShareMenu quand il est ouvert
        }}
      >
        {menuOptions.map((opt) => (
          <div
            key={opt.id}
            className="editor-header-kebab-menu-item"
            onClick={opt.onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                opt.onClick();
              }
            }}
            aria-label={opt.label}
            style={{ cursor: 'pointer' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {opt.icon}
              {opt.label}
            </span>
            {opt.id === 'share' && opt.showCopyButton && (
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="editor-header-kebab-menu-item"
                  style={{ padding: '0.4rem 0.6rem' }}
                  onClick={(e) => { e.stopPropagation(); handleCopyUrl(); }}
                  aria-label="Copier l'URL"
                >
                  {copyConfirmed ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </button>
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* ShareMenu intégré */}
      <ShareMenu
        noteId={noteId}
        currentSettings={currentShareSettings}
        publicUrl={publicUrl}
        onSettingsChange={onShareSettingsChange}
        isOpen={shareMenuOpen}
        onClose={() => setShareMenuOpen(false)}
      />
    </>
  );
};

export default EditorKebabMenu; 