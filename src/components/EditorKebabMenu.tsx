'use client';

import React, { useRef, useState, useEffect } from 'react';
import { FiShare2, FiDownload, FiCopy, FiMaximize2, FiMinimize2, FiCheck, FiCircle, FiFolder } from 'react-icons/fi';
import './editor-kebab-menu.css';
import ExportModal, { type ExportFormat } from './ExportModal';
import { noteExportFilename } from '@/utils/noteExportFilename';
import ShareMenu from './ShareMenu';
import MoveToSelector from './editor/MoveToSelector';
import type { ShareSettings, ShareSettingsUpdate } from '@/types/sharing';
import { getDefaultShareSettings } from '@/types/sharing';
import { simpleLogger as logger } from '@/utils/logger';
import { exportNoteToPdf } from '@/services/pdfExportService';
import { exportNoteToMarkdown } from '@/services/markdownExportService';
import { exportNoteToHtml } from '@/services/htmlExportService';
import { exportNoteToPlainText } from '@/services/plainTextExportService';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import toast from 'react-hot-toast';
import SocialShareMenu from '@/components/SocialShareMenu';

interface EditorKebabMenuProps {
  open: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  exportModalOpen: boolean;
  setExportModalOpen: (open: boolean) => void;
  /** Visiteur page publique : partage réseaux + export + mode large, sans A4 ni réglages Scrivia */
  menuVariant?: 'editor' | 'public';
  a4Mode: boolean;
  setA4Mode: (v: boolean) => void;
  slashLang: 'fr' | 'en';
  setSlashLang: (lang: 'fr' | 'en') => void;
  fullWidth: boolean;
  setFullWidth: (v: boolean) => void;
  showToolbar: boolean;
  toggleToolbar: () => void;
  noteId: string;
  currentTitle?: string;
  currentHtmlContent?: string;
  currentFontFamily?: string | null;
  currentShareSettings: ShareSettings;
  onShareSettingsChange: (settings: ShareSettingsUpdate) => Promise<void>;
  publicUrl?: string;
}

const EditorKebabMenu: React.FC<EditorKebabMenuProps> = ({
  open,
  position,
  onClose,
  exportModalOpen,
  setExportModalOpen,
  a4Mode,
  setA4Mode,
  slashLang,
  setSlashLang,
  fullWidth,
  setFullWidth,
  showToolbar,
  toggleToolbar,
  noteId,
  currentTitle,
  currentHtmlContent,
  currentFontFamily,
  currentShareSettings,
  onShareSettingsChange,
  publicUrl,
  menuVariant = 'editor',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [socialShareMenuOpen, setSocialShareMenuOpen] = useState(false);
  const [moveToMenuOpen, setMoveToMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingMd, setIsExportingMd] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState('');

  // Récupérer la note depuis le store
  const note = useFileSystemStore((state) => state.notes[noteId]);
  const htmlContent = currentHtmlContent || note?.html_content || '';
  const currentClasseurId = note?.classeur_id || null;

  useEffect(() => {
    setPublicShareUrl(typeof window !== 'undefined' ? window.location.href : '');
  }, []);

  useEffect(() => {
    if (!open) setSocialShareMenuOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;

      if (socialShareMenuOpen) {
        if (target.closest('[data-social-share-modal]')) return;
        onClose();
        setSocialShareMenuOpen(false);
        return;
      }

      // Si le ShareMenu est ouvert, ne pas fermer le menu kebab
      if (shareMenuOpen) {
        if (target.closest('.share-menu')) return;
        onClose();
        setShareMenuOpen(false);
        return;
      }
      
      // Si le MoveToSelector est ouvert, ne pas fermer le menu kebab
      if (moveToMenuOpen) {
        if (target.closest('.move-to-selector')) return;
        onClose();
        setMoveToMenuOpen(false);
        return;
      }

      // Menus fermés, logique normale
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setShareMenuOpen(false);
        setSocialShareMenuOpen(false);
        setMoveToMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose, shareMenuOpen, socialShareMenuOpen, moveToMenuOpen]);

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

      const title = currentTitle || note?.source_title || 'Note';
      
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
        htmlContent,
        filename: noteExportFilename(title, 'pdf'),
        fontFamily: currentFontFamily || note?.font_family || 'Manrope',
        headerImage: note?.header_image || null,
        headerImageOffset: note?.header_image_offset ?? 50,
        headerImageBlur: note?.header_image_blur ?? 0,
        headerImageOverlay: note?.header_image_overlay ?? 0,
        headerTitleInImage: note?.header_title_in_image ?? false,
      });

      if (result.success) {
        if (result.degraded) {
          toast.success(
            slashLang === 'fr'
              ? 'PDF exporté via un mode de secours, avec une fidélité visuelle réduite'
              : 'PDF exported via fallback mode with reduced visual fidelity'
          );
        } else {
          toast.success(slashLang === 'fr' ? 'PDF exporté avec succès' : 'PDF exported successfully');
        }
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

  const handleExportMarkdown = () => {
    if (isExportingMd) return;

    const title = currentTitle || note?.source_title || 'Note';

    if (!htmlContent || htmlContent.trim().length === 0) {
      toast.error(
        slashLang === 'fr'
          ? 'Erreur: Le contenu de la note est vide'
          : 'Error: Note content is empty'
      );
      return;
    }

    setIsExportingMd(true);
    onClose();

    const result = exportNoteToMarkdown({
      title,
      htmlContent,
      filename: noteExportFilename(title, 'md'),
    });

    if (result.success) {
      toast.success(
        slashLang === 'fr' ? 'Markdown exporté avec succès' : 'Markdown exported successfully'
      );
    } else {
      toast.error(
        slashLang === 'fr'
          ? `Erreur lors de l'export: ${result.error ?? 'Erreur inconnue'}`
          : `Export error: ${result.error ?? 'Unknown error'}`
      );
      logger.error('[EditorKebabMenu] Erreur export Markdown', { noteId, error: result.error });
    }

    setIsExportingMd(false);
  };

  const handleExportHtml = () => {
    const title = currentTitle || note?.source_title || 'Note';

    if (!htmlContent || htmlContent.trim().length === 0) {
      toast.error(
        slashLang === 'fr'
          ? 'Erreur: Le contenu de la note est vide'
          : 'Error: Note content is empty'
      );
      return;
    }

    onClose();

    const result = exportNoteToHtml({
      title,
      htmlContent,
      filename: noteExportFilename(title, 'html'),
      documentLang: slashLang,
    });

    if (result.success) {
      toast.success(
        slashLang === 'fr' ? 'HTML exporté avec succès' : 'HTML exported successfully'
      );
    } else {
      toast.error(
        slashLang === 'fr'
          ? `Erreur lors de l'export: ${result.error ?? 'Erreur inconnue'}`
          : `Export error: ${result.error ?? 'Unknown error'}`
      );
      logger.error('[EditorKebabMenu] Erreur export HTML', { noteId, error: result.error });
    }
  };

  const handleExportPlainText = () => {
    const title = currentTitle || note?.source_title || 'Note';

    if (!htmlContent || htmlContent.trim().length === 0) {
      toast.error(
        slashLang === 'fr'
          ? 'Erreur: Le contenu de la note est vide'
          : 'Error: Note content is empty'
      );
      return;
    }

    onClose();

    const result = exportNoteToPlainText({
      title,
      htmlContent,
      filename: noteExportFilename(title, 'txt'),
    });

    if (result.success) {
      toast.success(
        slashLang === 'fr'
          ? 'Texte brut exporté avec succès'
          : 'Plain text exported successfully'
      );
    } else {
      toast.error(
        slashLang === 'fr'
          ? `Erreur lors de l'export: ${result.error ?? 'Erreur inconnue'}`
          : `Export error: ${result.error ?? 'Unknown error'}`
      );
      logger.error('[EditorKebabMenu] Erreur export texte brut', {
        noteId,
        error: result.error,
      });
    }
  };

  // Handler unifié appelé par la modale export
  const handleExport = async (format: ExportFormat, baseFilename: string) => {
    const title = currentTitle || note?.source_title || 'Note';
    // baseFilename vient de la modale (déjà sans extension)
    const safe = baseFilename.trim() || title;
    const filename = (s: string, ext: string) =>
      `${s.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'note'}.${ext}`;

    if (format === 'pdf') {
      await handleExportPdf();
      return;
    }
    if (format === 'md') {
      handleExportMarkdown();
      return;
    }
    if (format === 'html') {
      handleExportHtml();
      return;
    }
    if (format === 'txt') {
      handleExportPlainText();
      return;
    }
    void filename; // satisfait le linter (utilisé indirectement via les handlers)
  };

  // Nom de fichier par défaut pour la modale (sans extension)
  const defaultExportFilename = (() => {
    const raw = currentTitle || note?.source_title || 'Note';
    return raw.trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'note';
  })();

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
      sharePublic: 'Partager la page',
      export: 'Exporter',
      exportPdf: 'En PDF',
      exportingPdf: 'Export PDF...',
      exportMd: 'En Markdown',
      exportingMd: 'Export MD...',
      exportHtml: 'En HTML',
      exportTxt: 'En texte brut',
      moveTo: 'Déplacer vers...',
      wideMode: 'Mode Large',
      a4Mode: 'Mode A4',
      toolbar: 'Zen Mode',
      published: 'Publié',
      publish: 'Publier',
      comingSoon: 'Bientôt'
    },
    en: {
      share: 'Share',
      sharePublic: 'Share page',
      export: 'Export',
      exportPdf: 'to PDF',
      exportingPdf: 'Exporting PDF...',
      exportMd: 'to Markdown',
      exportingMd: 'Exporting MD...',
      exportHtml: 'to HTML',
      exportTxt: 'to plain text',
      moveTo: 'Move to...',
      wideMode: 'Wide Mode',
      a4Mode: 'A4 Mode',
      toolbar: 'Zen Mode',
      published: 'Published',
      publish: 'Publish',
      comingSoon: 'Coming Soon'
    }
  } as const;

  const t = translations[slashLang];

  type MenuRow = {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    color: string;
    showCopyButton: boolean;
    disabled?: boolean;
  };

  const publicMenuOptions: MenuRow[] = [
    {
      id: 'socialShare',
      label: t.sharePublic,
      icon: <FiShare2 size={16} />,
      onClick: () => { setSocialShareMenuOpen((v) => !v); },
      color: '#D4D4D4',
      showCopyButton: false,
    },
    {
      id: 'export',
      label: t.export,
      icon: <FiDownload size={16} />,
      onClick: () => {
        setExportModalOpen(true);
        onClose();
      },
      color: '#D4D4D4',
      showCopyButton: false,
    },
    {
      id: 'fullWidth',
      label: t.wideMode,
      icon: fullWidth ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />,
      onClick: () => {
        void setFullWidth(!fullWidth);
        onClose();
      },
      color: fullWidth ? '#10b981' : '#D4D4D4',
      showCopyButton: false,
    },
  ];

  const editorMenuOptions: MenuRow[] = [
    {
      id: 'share',
      label: t.share,
      icon: <FiShare2 size={16} />,
      onClick: () => { setShareMenuOpen(true); },
      color: '#D4D4D4',
      showCopyButton: !!(currentShareSettings?.visibility !== 'private' && publicUrl),
    },
    {
      id: 'export',
      label: t.export,
      icon: <FiDownload size={16} />,
      onClick: () => {
        setExportModalOpen(true);
        onClose();
      },
      color: '#D4D4D4',
      showCopyButton: false,
    },
    {
      id: 'moveTo',
      label: t.moveTo,
      icon: <FiFolder size={16} />,
      onClick: () => { setMoveToMenuOpen(true); },
      color: '#D4D4D4',
      showCopyButton: false,
    },
    {
      id: 'toolbar',
      label: t.toolbar,
      icon: <FiCircle size={16} />,
      onClick: () => { toggleToolbar(); onClose(); },
      color: showToolbar ? '#D4D4D4' : '#10b981',
      showCopyButton: false,
    },
    {
      id: 'fullWidth',
      label: t.wideMode,
      icon: fullWidth ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />,
      onClick: () => {
        void setFullWidth(!fullWidth);
        onClose();
      },
      color: fullWidth ? '#10b981' : '#D4D4D4',
      showCopyButton: false,
    },
    {
      id: 'a4Mode',
      label: t.a4Mode,
      icon: <A4Icon />,
      onClick: () => { void setA4Mode(!a4Mode); },
      color: a4Mode ? '#10b981' : '#D4D4D4',
      showCopyButton: false,
    },
  ];

  const menuOptions = menuVariant === 'public' ? publicMenuOptions : editorMenuOptions;

  // La modale Export doit persister même quand le menu kebab est fermé (open=false),
  // sinon le composant se démonte avant que la modale n'ait le temps de s'afficher.
  if (!open && !exportModalOpen) return null;

  return (
    <>
      {open && <div className="editor-kebab-overlay" onClick={onClose} />}
      
      {open && <div
        className="editor-header-kebab-menu"
        ref={menuRef}
        style={{ 
          position: 'absolute',
          top: '100%',
          right: '10px',
          zIndex: (shareMenuOpen || moveToMenuOpen || socialShareMenuOpen) ? 999 : 1000
        }}
      >
        {menuOptions.map((opt) => (
          <div
            key={opt.id}
            className="editor-header-kebab-menu-item"
            onClick={opt.disabled ? undefined : opt.onClick}
            role="button"
            tabIndex={opt.disabled ? -1 : 0}
            style={{ 
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
              opacity: opt.disabled ? 0.6 : 1,
              color: opt.color
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {opt.icon}
              {opt.label}
            </span>
            {(opt.id === 'toolbar' || opt.id === 'fullWidth') && (
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}>
                <label className="kebab-toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={opt.id === 'toolbar' ? !showToolbar : fullWidth}
                    onChange={(e) => { e.stopPropagation(); opt.onClick(); }}
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
                >
                  {copyConfirmed ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </button>
              </span>
            )}
          </div>
        ))}
        {menuVariant === 'public' && (
          <SocialShareMenu
            url={publicShareUrl}
            title={currentTitle || note?.source_title || 'Note'}
            isOpen={socialShareMenuOpen}
            onClose={() => setSocialShareMenuOpen(false)}
          />
        )}
      </div>}

      {/* Modale Export — rendu même quand open=false pour survivre au démontage du menu */}
      <ExportModal
        open={exportModalOpen}
        defaultFilename={defaultExportFilename}
        onExport={handleExport}
        onClose={() => setExportModalOpen(false)}
        isExporting={isExporting || isExportingMd}
        lang={slashLang}
      />
      
      {/* ShareMenu (réglages Scrivia) — pas sur la page publique visiteur */}
      {open && menuVariant === 'editor' && (
        <ShareMenu
          noteId={noteId}
          currentSettings={currentShareSettings}
          publicUrl={publicUrl}
          onSettingsChange={onShareSettingsChange}
          isOpen={shareMenuOpen}
          onClose={() => setShareMenuOpen(false)}
        />
      )}

      {/* MoveToSelector intégré */}
      {open && menuVariant === 'editor' && moveToMenuOpen && (
        <MoveToSelector
          noteId={noteId}
          currentClasseurId={currentClasseurId}
          onMoveComplete={() => {
            setMoveToMenuOpen(false);
            onClose();
          }}
          onClose={() => setMoveToMenuOpen(false)}
          lang={slashLang}
        />
      )}
    </>
  );
};

export default EditorKebabMenu; 