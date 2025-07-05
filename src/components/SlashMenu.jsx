import React, { useEffect, useRef, useState } from 'react';
import { SLASH_COMMANDS } from './slashCommands';

const SlashMenu = ({ open, search, setSearch, onSelect, anchorRef, lang = 'fr' }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Filtrage dynamique selon la langue
  const filtered = SLASH_COMMANDS.filter(cmd =>
    cmd.alias[lang].toLowerCase().includes(search.toLowerCase()) ||
    cmd.label[lang].toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Navigation clavier
  const handleKeyDown = (e) => {
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
        position: 'absolute',
        left: anchorRef.current?.left ?? 0,
        top: anchorRef.current?.top ?? 0,
        zIndex: 100,
        minWidth: 320,
        background: 'var(--surface-1)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: 0,
        border: '1px solid var(--border-color)',
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
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text-primary)',
          fontSize: 16,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
        }}
      />
      <div className="slash-menu-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-secondary)' }}>
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
              padding: '12px 16px',
              background: i === selectedIndex ? 'var(--bg-surface-hover)' : 'transparent',
              cursor: 'pointer',
              borderLeft: i === selectedIndex ? '3px solid var(--accent-primary)' : '3px solid transparent',
            }}
            onMouseEnter={() => setSelectedIndex(i)}
            onClick={() => onSelect(cmd)}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                <span style={{ color: 'var(--accent-primary)', marginRight: 8 }}>{cmd.alias[lang]}</span>
                {cmd.label[lang]}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{cmd.description[lang]}</div>
            </div>
            {cmd.preview && (
              <div
                className="slash-menu-preview"
                style={{ marginLeft: 16, minWidth: 60, color: 'var(--text-secondary)' }}
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