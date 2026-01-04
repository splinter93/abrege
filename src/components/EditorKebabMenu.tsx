'use client';

import React, { useRef, useState, useEffect } from 'react';
import { FiShare2, FiDownload, FiCopy, FiMaximize2, FiMinimize2, FiGlobe, FiCheck, FiEye, FiEyeOff, FiCircle } from 'react-icons/fi';
import './editor-kebab-menu.css';
import ShareMenu from './ShareMenu';
import type { ShareSettings, ShareSettingsUpdate } from '@/types/sharing';
import { getDefaultShareSettings } from '@/types/sharing';
import { simpleLogger as logger } from '@/utils/logger';
import { exportNoteToPdf } from '@/services/pdfExportService';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import toast from 'react-hot-toast';

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
  const [isExporting, setIsExporting] = useState(false);

  // Récupérer la note depuis le store
  const note = useFileSystemStore((state) => state.notes[noteId]);
  // Utiliser directement html_content de la base de données (généré par Tiptap)
  const htmlContent = note?.html_content || '';

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
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[EditorKebabMenu] currentShareSettings is undefined, using default');
    }
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

  const handleExportPdf = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);
      onClose(); // Fermer le menu

      const title = note?.source_title || 'Note';
      
      // ✅ Debug: Vérifier le contenu avant export
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[EditorKebabMenu] Export PDF', {
          noteId,
          title,
          htmlLength: htmlContent.length,
          htmlPreview: htmlContent.substring(0, 200),
          hasNote: !!note,
          hasContent: !!htmlContent && htmlContent.length > 0
        });
      }

      if (!htmlContent || htmlContent.trim().length === 0) {
        toast.error(
          slashLang === 'fr' 
            ? 'Erreur: Le contenu de la note est vide' 
            : 'Error: Note content is empty'
        );
        return;
      }

      const result = await exportNoteToPdf({
        title,
        htmlContent: htmlContent,
        filename: `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        headerImage: note?.header_image || null
      });

      if (result.success) {
        toast.success(slashLang === 'fr' ? 'PDF exporté avec succès' : 'PDF exported successfully');
      } else {
        toast.error(
          slashLang === 'fr' 
            ? `Erreur lors de l'export: ${result.error || 'Erreur inconnue'}` 
            : `Export error: ${result.error || 'Unknown error'}`
        );
        logger.error('[EditorKebabMenu] Erreur export PDF', {
          noteId,
          error: result.error
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(
        slashLang === 'fr' 
          ? `Erreur lors de l'export: ${errorMessage}` 
          : `Export error: ${errorMessage}`
      );
      logger.error('[EditorKebabMenu] Exception export PDF', {
        noteId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsExporting(false);
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
      export: 'Exporter en PDF',
      exporting: 'Export en cours...',
      wideMode: 'Mode Large',
      a4Mode: 'Mode A4',
      toolbar: 'Zen Mode',
      published: 'Publié',
      publish: 'Publier',
      comingSoon: 'Bientôt'
    },
    en: {
      share: 'Share',
      export: 'Export to PDF',
      exporting: 'Exporting...',
      wideMode: 'Wide Mode',
      a4Mode: 'A4 Mode',
      toolbar: 'Zen Mode',
      published: 'Published',
      publish: 'Publish',
      comingSoon: 'Coming Soon'
    }
  } as const;

  const t = translations[slashLang];

  const menuOptions: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    color: string;
    showCopyButton: boolean;
    disabled?: boolean;
    type?: 'coming-soon';
  }> = [
    {
      id: 'share',
      label: t.share,
      icon: <FiShare2 size={18} />,
      onClick: () => { 
        setShareMenuOpen(true);
        // Ne pas fermer le menu kebab, le ShareMenu se superposera
      },
      color: currentShareSettings?.visibility === 'private' ? '#D4D4D4' : '#ff6b35',
      showCopyButton: !!(currentShareSettings?.visibility !== 'private' && publicUrl),
    },
    {
      id: 'export',
      label: isExporting ? t.exporting : t.export,
      icon: <FiDownload size={18} />,
      onClick: handleExportPdf,
      color: isExporting ? '#10b981' : '#D4D4D4',
      showCopyButton: false,
      disabled: isExporting,
    },
    {
      id: 'toolbar',
      label: t.toolbar,
      icon: showToolbar ? <FiCircle size={18} /> : <FiCircle size={18} />,
      onClick: () => { 
        toggleToolbar();
        onClose(); 
      },
      color: showToolbar ? '#D4D4D4' : '#10b981', // Inversé : vert quand Zen Mode (toolbar cachée)
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
          position: 'absolute',  /* ✅ Absolute pour suivre le header sticky */
          top: '100%',           /* ✅ Juste sous le header */
          right: '55px',        /* ✅ Décalé 100px vers la gauche (6px + 100px) */
          marginTop: '0px',      /* ✅ Petit espace sous le header */
          zIndex: shareMenuOpen ? 999 : 1000
        }}
      >
        {menuOptions.map((opt) => (
          <div
            key={opt.id}
            className="editor-header-kebab-menu-item"
            onClick={opt.disabled ? undefined : opt.onClick}
            role="button"
            tabIndex={opt.disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (opt.disabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                opt.onClick();
              }
            }}
            aria-label={opt.label}
            aria-disabled={opt.disabled}
            style={{ 
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
              opacity: opt.disabled ? 0.6 : 1
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {opt.icon}
              {opt.label}
            </span>
            {/* Toggle pour Zen Mode et Wide Mode */}
            {(opt.id === 'toolbar' || opt.id === 'fullWidth') && (
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}>
                <label className="kebab-toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={opt.id === 'toolbar' ? !showToolbar : fullWidth}
                    onChange={(e) => {
                      e.stopPropagation();
                      opt.onClick();
                    }}
                    aria-label={opt.label}
                  />
                  <span className="kebab-toggle-slider"></span>
                </label>
              </span>
            )}
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