import React, { useState, useRef } from 'react';
import { FiMenu } from 'react-icons/fi';

/**
 * @typedef {import('../types/editor').Heading} Heading
 */

/**
 * @param {{
 *   headings?: Heading[],
 *   currentId?: string,
 *   pinned?: boolean,
 *   onPin?: () => void,
 *   onClose?: () => void,
 *   containerRef?: React.RefObject<any>
 * }} props
 */
export default function TableOfContents({ headings = [], currentId, pinned = false, onPin, onClose, containerRef }) {
  // DEBUG: forcer l'affichage TOC déployé
  const [hovered, setHovered] = useState(false);
  const tocRef = useRef(null);

  // Mode rétracté par défaut, déplié au hover
  const isCollapsed = !hovered;

  // Responsive : masquée si largeur < 900px
  if (typeof window !== 'undefined' && window.innerWidth < 900) return null;

  // Centralisation des styles TOC
  const tocContainerStyle = {
    width: 300,
    background: 'var(--surface-1)',
    border: '1.5px solid var(--border-subtle)',
    borderRadius: 16,
    color: '#a3a3a3',
    overflowY: 'auto',
    fontFamily: 'Noto Sans, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 0,
    padding: '14px 18px 14px 18px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    maxHeight: '45vh',
    transition: `width 0.32s cubic-bezier(0.2, 0.8, 0.4, 1), min-width 0.32s cubic-bezier(0.2, 0.8, 0.4, 1), max-width 0.32s cubic-bezier(0.2, 0.8, 0.4, 1), padding 0.32s cubic-bezier(0.2, 0.8, 0.4, 1), transform 0.32s cubic-bezier(0.2, 0.8, 0.4, 1)`,
    ...(isCollapsed ? { border: 'none', background: 'none', boxShadow: 'none', transform: 'translateY(6%)' } : { transform: 'translateY(6%)' }),
  };
  const tocItemStyles = {
    1: {
      fontWeight: 600,
      fontSize: 16,
      color: '#f5f5f5',
      marginBottom: 8,
      background: 'none',
      borderRadius: 0,
      padding: 0,
      paddingLeft: 0,
      transition: 'background 0.18s, color 0.18s',
      cursor: 'pointer',
      whiteSpace: 'pre-line',
      width: '100%',
      boxSizing: 'border-box',
    },
    2: {
      fontWeight: 700,
      fontSize: 15,
      color: '#a3a3a3',
      marginBottom: 4,
      background: 'none',
      borderRadius: 0,
      padding: 0,
      paddingLeft: 12,
      transition: 'background 0.18s, color 0.18s',
      cursor: 'pointer',
      whiteSpace: 'pre-line',
      width: '100%',
      boxSizing: 'border-box',
    },
    3: {
      fontWeight: 400,
      fontSize: 14,
      color: '#bdbdbd',
      background: 'none',
      borderRadius: 0,
      padding: 0,
      paddingLeft: 32,
      marginBottom: 2,
      lineHeight: 1.7,
      transition: 'background 0.18s, color 0.18s',
      cursor: 'pointer',
      whiteSpace: 'pre-line',
      width: '100%',
      boxSizing: 'border-box',
    }
  };

  // Debug: fonction de clic isolée pour tester l'effet flash
  const handleHeadingClick = (h) => {
    if (!containerRef?.current) return;

    const proseMirrorContainer = containerRef.current.querySelector('.ProseMirror');
    if (!proseMirrorContainer) return;

    // Tenter de trouver l'élément par ID
    let el = proseMirrorContainer.querySelector(`#${CSS.escape(h.id)}`);
    if (!el) {
      // Fallback : trouver par niveau et texte, puis assigner l'id
      const candidates = Array.from(proseMirrorContainer.querySelectorAll(`h${h.level}`));
      const match = candidates.find(node => node.textContent.trim() === h.text.trim());
      if (match) {
        match.setAttribute('id', h.id);
        el = match;
      }
    }
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('active-flash');
    setTimeout(() => el.classList.remove('active-flash'), 1400);
  };

  return (
    <nav
      ref={tocRef}
      style={tocContainerStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
        {isCollapsed ? (
          headings.map((h, idx) => {
            if (h.level === 2) {
              return <div key={h.id || `toc-bar-${idx}`} style={{ height: 3, width: 24, background: 'var(--border-strong)', borderRadius: 2, margin: '12px 0', marginLeft: 'auto', marginRight: 10 }} />;
            }
            if (h.level === 3) {
              return <div key={h.id || `toc-bar-${idx}`} style={{ height: 3, width: 12, background: 'var(--border-strong)', borderRadius: 2, margin: '12px 0', marginLeft: 'auto', marginRight: 10 }} />;
            }
            return <div key={h.id || `toc-bar-${idx}`} style={{ height: 12, margin: '12px 0' }} />;
          })
        ) : (
          headings.map((h, idx) => {
            const baseStyle = tocItemStyles[h.level] || tocItemStyles[3];
            let style = { ...baseStyle };
            if (currentId === h.id) {
              style = { ...style, background: 'none', color: '#fff' };
            }
            // Ajout du séparateur avant chaque H2 sauf le premier
            const isH2 = h.level === 2;
            const prevIsH2 = idx > 0 && headings[idx - 1].level === 2;
            return (
              <React.Fragment key={h.id || `toc-item-${idx}`}>
                {isH2 && idx > 0 && !prevIsH2 && (
                  <hr style={{
                    height: 1,
                    background: 'var(--border-subtle)',
                    border: 'none',
                    margin: '8px 0',
                    width: '100%'
                  }} />
                )}
                <div
                  onClick={() => handleHeadingClick(h)}
                  style={style}
                  title={h.text}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#2994ff';
                  }}
                  onMouseOut={e => {
                    if (currentId === h.id) {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = '#fff';
                    } else {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = h.level === 1 ? '#2994ff' : h.level === 2 ? '#a3a3a3' : '#fff';
                    }
                  }}
                >
                  {h.text}
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </nav>
  );
} 