import React, { useEffect, useRef, useState } from 'react';
import { SLASH_COMMANDS } from './slashCommands';

interface SlashCommand {
  id: string;
  alias: Record<string, string | string[]>;
  label: Record<string, string>;
  description: Record<string, string>;
  preview?: string;
  [key: string]: unknown;
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
  const menuRef = useRef<HTMLDivElement>(null);
  // Décale le menu au-dessus du caret
  let menuTop = (anchorRef.current?.top ?? 0) - 180; // Offset par défaut (180px)
  if (menuRef.current) {
    const height = menuRef.current.offsetHeight;
    if (height && anchorRef.current?.top) {
      menuTop = anchorRef.current.top - height - 10; // 10px de marge
    }
  }

  const langKey = (lang ?? 'fr') as 'fr' | 'en';

  const filtered = SLASH_COMMANDS.filter((cmd: SlashCommand) => {
    const aliases = Array.isArray(cmd.alias[langKey]) ? cmd.alias[langKey] : [cmd.alias[langKey]];
    return (
      aliases.some(a => a && a.toLowerCase().includes(search.toLowerCase())) ||
      cmd.label[langKey].toLowerCase().includes(search.toLowerCase())
    );
  });

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
      ref={menuRef}
      className="slash-menu"
      style={{
        position: 'fixed',
        left: anchorRef.current?.left ?? 0,
        top: menuTop,
        zIndex: 99999,
        minWidth: 220,
        maxWidth: 320,
        background: 'rgba(28,28,32,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 10,
        boxShadow: '0 4px 16px 0 rgba(0,0,0,0.10)',
        padding: 0,
        border: '1px solid #4446',
        fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
        fontSize: 14,
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
          fontSize: 15,
          padding: '10px 14px 8px 14px',
          borderBottom: '1px solid #4444',
          borderRadius: '10px 10px 0 0',
          fontWeight: 600,
          letterSpacing: 0.01,
          transition: 'background 0.15s, color 0.15s',
          fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
        }}
      />
      <div className="slash-menu-list" style={{ maxHeight: 260, overflowY: 'auto', padding: '2px 0', scrollbarWidth: 'thin', scrollbarColor: '#4446 #18181c' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 12, color: 'var(--text-secondary)', textAlign: 'center', fontSize: 14 }}>
            {lang === 'fr' ? 'Aucune commande trouvée.' : 'No command found.'}
          </div>
        )}
        {filtered.map((cmd, i) => {
          return (
            <div
              key={cmd.id}
              className={`slash-menu-item${i === selectedIndex ? ' selected' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: i === selectedIndex ? '7px 14px' : '6px 14px',
                background: i === selectedIndex ? 'rgba(255,255,255,0.03)' : 'transparent',
                cursor: 'pointer',
                borderLeft: 'none',
                borderRadius: 6,
                margin: '1px 4px',
                color: i === selectedIndex ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontWeight: i === selectedIndex ? 700 : 500,
                transition: 'background 0.13s, color 0.13s',
                minHeight: 0,
                boxShadow: 'none',
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => onSelect(cmd)}
              onMouseDown={e => e.preventDefault()}
            >
              {/* Preview à gauche */}
              {cmd.preview && (
                <span style={{ minWidth: 32, textAlign: 'center', color: 'var(--text-secondary)', opacity: 0.92, fontSize: 17, fontWeight: 700, marginRight: 14, display: 'inline-block' }} dangerouslySetInnerHTML={{ __html: cmd.preview }} />
              )}
              {/* Label à droite, toujours visible */}
              <span style={{ fontWeight: 500, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{cmd.label[langKey]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SlashMenu; 