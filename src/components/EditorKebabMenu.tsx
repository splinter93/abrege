import React, { useEffect, useRef } from 'react';
import { FiShare2, FiDownload, FiCheck } from 'react-icons/fi';
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

function Toggle({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) {
  return (
    <label className="kebab-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="kebab-toggle-slider" />
      <span className="kebab-toggle-label">{label}</span>
    </label>
  );
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
        minWidth: 260,
        background: 'var(--bg-main, #18181c)',
        border: '1px solid #4446',
        borderRadius: 14,
        boxShadow: '0 6px 32px 0 rgba(0,0,0,0.16)',
        zIndex: 99999,
        padding: '16px 0 10px 0',
        animation: 'fadeInMenu 0.18s',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Groupe 1 : Actions */}
      <div style={{ padding: '0 20px 8px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button style={menuItemStyle} onClick={() => { onClose(); /* TODO: implémenter partage */ }}>
          <FiShare2 style={{ marginRight: 10, opacity: 0.8 }} /> Partager
        </button>
        <button style={menuItemStyle} onClick={() => { onClose(); /* TODO: implémenter export */ }}>
          <FiDownload style={{ marginRight: 10, opacity: 0.8 }} /> Exporter
        </button>
      </div>
      <div style={menuDividerStyle} />
      {/* Groupe 2 : Affichage & options */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Toggle checked={autosaveOn} onChange={setAutosaveOn} label="Autosave" />
        <Toggle checked={wideMode} onChange={setWideMode} label="Wide Mode" />
        <Toggle checked={a4Mode} onChange={v => setA4Mode(!!v)} label="A4 Mode" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Toggle checked={published} onChange={setPublished} label="Published" />
          {published && publishedUrl && (
            <button
              style={{
                ...menuItemStyle,
                padding: '6px 8px',
                fontSize: 13,
                color: '#e55a2c',
                background: 'none',
                border: '1px solid #e55a2c',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(publishedUrl);
                  // Feedback visuel temporaire
                  const button = document.activeElement as HTMLButtonElement;
                  if (button) {
                    const originalText = button.textContent;
                    button.textContent = 'Copié !';
                    button.style.background = '#e55a2c';
                    button.style.color = '#fff';
                    setTimeout(() => {
                      button.textContent = originalText;
                      button.style.background = 'none';
                      button.style.color = '#e55a2c';
                    }, 1000);
                  }
                } catch (err) {
                  console.error('Erreur copie:', err);
                }
              }}
              title="Copier l'URL de partage"
            >
              Copier URL
            </button>
          )}
        </div>
      </div>
      <div style={menuDividerStyle} />
      {/* Groupe 3 : Langue du SlashMenu */}
      <div style={{ padding: '8px 20px 0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 2 }}>Slash Menu Language</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="kebab-radio">
            <input type="radio" name="slashLang" checked={slashLang === 'en'} onChange={() => setSlashLang('en')} />
            <span>EN</span>
          </label>
          <label className="kebab-radio">
            <input type="radio" name="slashLang" checked={slashLang === 'fr'} onChange={() => setSlashLang('fr')} />
            <span>FR</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default EditorKebabMenu; 