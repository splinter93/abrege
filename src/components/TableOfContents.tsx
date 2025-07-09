import React, { useState, useRef, useEffect } from 'react';
import { FiMenu } from 'react-icons/fi';
import type { Heading } from '../types/editor';

interface TableOfContentsProps {
  headings?: Heading[];
  currentId?: string;
  pinned?: boolean;
  onPin?: () => void;
  onClose?: () => void;
  containerRef?: React.RefObject<any>;
}

export default function TableOfContents({ headings = [], currentId, pinned = false, onPin, onClose, containerRef }: TableOfContentsProps) {
  const [hovered, setHovered] = useState(false);
  const [show, setShow] = useState(true);
  const tocRef = useRef<HTMLDivElement>(null);

  // Responsive : masquée si largeur < 900px (évite SSR mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => setShow(window.innerWidth >= 900);
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  if (!show) return null;

  const isCollapsed = !hovered;

  const tocContainerStyle: React.CSSProperties = {
    width: isCollapsed ? 32 : 300,
    background: isCollapsed ? 'transparent' : 'var(--surface-1)',
    border: isCollapsed ? 'none' : '1.5px solid var(--border-subtle)',
    borderRadius: 16,
    color: '#a3a3a3',
    overflowY: 'auto',
    fontFamily: 'Noto Sans, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 0,
    padding: isCollapsed ? '0' : '14px 18px',
    boxShadow: isCollapsed ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
    maxHeight: '80vh',
    transition: 'all 0.32s cubic-bezier(0.2, 0.8, 0.4, 1)',
    transform: isCollapsed ? 'translateX(0)' : 'none',
    backdropFilter: isCollapsed ? 'none' : 'blur(8px)',
    WebkitBackdropFilter: isCollapsed ? 'none' : 'blur(8px)',
    pointerEvents: 'all',
    minWidth: isCollapsed ? 32 : 300,
  };
  const tocItemStyles: Record<number, React.CSSProperties> = {
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

  const handleHeadingClick = (h: Heading) => {
    if (!containerRef?.current) return;
    const proseMirrorContainer = containerRef.current.querySelector('.ProseMirror');
    if (!proseMirrorContainer) return;
    let el = proseMirrorContainer.querySelector(`#${CSS.escape(h.id)}`);
    if (!el) {
      const candidates = Array.from(proseMirrorContainer.querySelectorAll(`h${h.level}`)) as HTMLElement[];
      const match = candidates.find(node => node.textContent && h.text && node.textContent.trim() === h.text.trim());
      if (match) {
        match.setAttribute('id', h.id);
        el = match;
      }
    }
    if (!el) return;
    (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
    (el as HTMLElement).classList.add('active-flash');
    setTimeout(() => (el as HTMLElement).classList.remove('active-flash'), 1400);
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
              return <div key={h.id || `toc-bar-${idx}`} style={{ height: 3, width: 24, background: '#D4D4D4', borderRadius: 6, margin: '12px 0', marginLeft: 'auto', marginRight: 10, opacity: 0.8 }} />;
            }
            if (h.level === 3) {
              return <div key={h.id || `toc-bar-${idx}`} style={{ height: 3, width: 12, background: '#D4D4D4', borderRadius: 6, margin: '12px 0', marginLeft: 'auto', marginRight: 10, opacity: 0.8 }} />;
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
                    (e.currentTarget as HTMLDivElement).style.background = 'none';
                    (e.currentTarget as HTMLDivElement).style.color = '#2994ff';
                  }}
                  onMouseOut={e => {
                    if (currentId === h.id) {
                      (e.currentTarget as HTMLDivElement).style.background = 'none';
                      (e.currentTarget as HTMLDivElement).style.color = '#fff';
                    } else {
                      (e.currentTarget as HTMLDivElement).style.background = 'none';
                      (e.currentTarget as HTMLDivElement).style.color = h.level === 1 ? '#2994ff' : h.level === 2 ? '#a3a3a3' : '#fff';
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