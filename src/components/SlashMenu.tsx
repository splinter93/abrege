import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  // Clamp position to viewport and prefer placing below caret like Notion
  useEffect(() => {
    if (!open) return;
    const left = Math.max(8, Math.min((anchorRef.current?.left ?? 0), window.innerWidth - 320 - 8));
    const topBelow = Math.min((anchorRef.current?.top ?? 0) + 16, window.innerHeight - 16);
    const height = menuRef.current?.offsetHeight ?? 260;
    const top = topBelow + height + 16 > window.innerHeight ? Math.max(8, (anchorRef.current?.top ?? 0) - height - 10) : topBelow;
    setCoords({ left, top });
  }, [open, anchorRef]);

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
      anchorRef.current?.closeMenu && anchorRef.current.closeMenu();
    }
  };

  if (!open) return null;

  const menu = (
    <div
      ref={menuRef}
      className="slash-menu"
      style={{ position: 'fixed', left: coords.left, top: coords.top }}
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
      />
      <div className="slash-menu-list">
        {filtered.length === 0 && (
          <div className="slash-menu-empty">
            {lang === 'fr' ? 'Aucune commande trouvée.' : 'No command found.'}
          </div>
        )}
        {filtered.map((cmd, i) => {
          return (
            <div
              key={cmd.id}
              className={`slash-menu-item${i === selectedIndex ? ' selected' : ''}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => onSelect(cmd)}
              onMouseDown={e => e.preventDefault()}
            >
              {cmd.preview && (
                <span className="slash-menu-preview" dangerouslySetInnerHTML={{ __html: cmd.preview }} />
              )}
              <div className="slash-menu-texts">
                <span className="slash-menu-label">{cmd.label[langKey]}</span>
                {cmd.description?.[langKey] && (
                  <span className="slash-menu-desc">{cmd.description[langKey]}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return createPortal(menu, document.body);
};

export default SlashMenu; 