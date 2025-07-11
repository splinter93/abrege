import React, { useEffect, useRef, useState } from 'react';
import { SLASH_COMMANDS } from './slashCommands';

interface SlashCommand {
  id: string;
  alias: Record<string, string>;
  label: Record<string, string>;
  description: Record<string, string>;
  preview?: string;
  [key: string]: any;
}

interface AnchorRef {
  current: { left: number; top: number; closeMenu?: () => void } | null;
}

interface SlashMenuProps {
  open: boolean;
  search: string;
  setSearch: (s: string) => void;
  onSelect: (cmd: SlashCommand) => void;
  anchorRef: AnchorRef;
  lang?: string;
}

const SlashMenu: React.FC<SlashMenuProps> = ({ open, search, setSearch, onSelect, anchorRef, lang = 'fr' }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const langKey = (lang ?? 'fr') as 'fr' | 'en';

  const filtered = SLASH_COMMANDS.filter((cmd: SlashCommand) =>
    cmd.alias[langKey].toLowerCase().includes(search.toLowerCase()) ||
    cmd.label[langKey].toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(i => Math.max(i - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (filtered[selectedIndex]) onSelect(filtered[selectedIndex]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setSearch('');
      e.preventDefault();
    }
  };

  if (!open) return null;

  return (
    <div
      className="slash-menu"
      style={{
        position: 'fixed',
        left: anchorRef.current?.left ?? 0,
        top: anchorRef.current?.top ?? 0,
        zIndex: 99999,
        minWidth: 320,
        maxWidth: 420,
        background: 'rgba(28,28,32,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 14,
        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.16)',
        padding: 0,
        border: '1px solid #4446',
        fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
        fontSize: 15,
        transition: 'opacity 0.18s, transform 0.18s',
        opacity: 1,
        transform: 'scale(1)',
        overflow: 'hidden',
      }}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        className="slash-search-input"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={lang === 'fr' ? 'Rechercher une commande...' : 'Search a command...'}
        onBlur={() => {
          if (typeof anchorRef.current?.closeMenu === 'function') anchorRef.current.closeMenu();
        }}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--accent-primary, #2994ff)',
          fontSize: 16,
          padding: '16px 20px 14px 20px',
          borderBottom: '1px solid #4446',
          borderRadius: '14px 14px 0 0',
          fontWeight: 600,
          letterSpacing: 0.01,
          transition: 'background 0.15s, color 0.15s',
          fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
        }}
      />
      <div className="slash-menu-list" style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0', scrollbarWidth: 'thin', scrollbarColor: '#4446 #18181c' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 18, color: 'var(--text-secondary)', textAlign: 'center', fontSize: 15 }}>
            {lang === 'fr' ? 'Aucune commande trouvée.' : 'No command found.'}
          </div>
        )}
        {filtered.map((cmd, i) => (
          <div
            key={cmd.id}
            className={`slash-menu-item${i === selectedIndex ? ' selected' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '13px 22px',
              background: i === selectedIndex ? 'rgba(255,255,255,0.07)' : 'transparent',
              cursor: 'pointer',
              borderLeft: 'none',
              borderRadius: 8,
              margin: '2px 8px',
              color: i === selectedIndex ? 'var(--accent-primary)' : 'var(--text-primary)',
              fontWeight: i === selectedIndex ? 700 : 500,
              transition: 'background 0.13s, color 0.13s',
            }}
            onMouseEnter={() => setSelectedIndex(i)}
            onClick={() => onSelect(cmd)}
            onMouseDown={e => e.preventDefault()}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--accent-primary)', marginRight: 8, fontWeight: 700 }}>{cmd.alias[langKey]}</span>
                {cmd.label[langKey]}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{cmd.description[langKey]}</div>
            </div>
            {cmd.preview && (
              <div
                className="slash-menu-preview"
                style={{ marginLeft: 18, minWidth: 60, color: 'var(--text-secondary)', opacity: 0.85, fontSize: 14 }}
                dangerouslySetInnerHTML={{ __html: cmd.preview }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SlashMenu; 