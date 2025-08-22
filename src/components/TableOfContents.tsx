import React, { useState, useRef } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings?: Heading[];
  currentId?: string;
  pinned?: boolean;
  onPin?: () => void;
  onClose?: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export default function TableOfContents({ headings = [], currentId, containerRef }: TableOfContentsProps) {
  const [hovered, setHovered] = useState(false);
  // 🚨 SUPPRIMÉ : La TOC doit toujours être visible, pas de logique responsive
  // const [show, setShow] = useState(true);
  const tocRef = useRef<HTMLDivElement>(null);

  // 🚨 SUPPRIMÉ : Plus de logique responsive qui masque la TOC
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     const handleResize = () => {
  //       requestAnimationFrame(() => {
  //         const newShow = window.innerWidth >= 900;
  //         if (newShow !== show) {
  //           setShow(newShow);
  //         }
  //       });
  //     };
  //     
  //     const timer = setTimeout(handleResize, 100);
  //     
  //     window.addEventListener('resize', handleResize);
  //     return () => {
  //       clearTimeout(timer);
  //       window.removeEventListener('resize', handleResize);
  //     };
  //   }
  // }, [show]);
  
  // 🚨 SUPPRIMÉ : La TOC ne doit JAMAIS être masquée
  // const shouldShow = show || headings.length > 0;
  // if (!shouldShow) return null;

  const isCollapsed = !hovered;

  // Si pas de headings, afficher un état vide mais garder la TOC visible
  const hasHeadings = headings && headings.length > 0;

  const tocContainerStyle: React.CSSProperties = isCollapsed
    ? {
        position: 'fixed',
        right: 8,
        top: 383,
        minWidth: 32,
        padding: 0,
        zIndex: 30,
        background: 'transparent',
        border: 'none',
        borderRadius: 16,
        color: 'var(--editor-text-color)',
        overflowY: 'auto',
        fontFamily: 'Noto Sans, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0,
        boxShadow: 'none',
        maxHeight: undefined,
        transition: 'all 0.32s cubic-bezier(0.2, 0.8, 0.4, 1)',
        transform: 'translateX(0)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        pointerEvents: 'all',
      }
    : {
        width: 300,
        background: 'var(--surface-1)',
        border: '1.5px solid var(--border-subtle)',
        borderRadius: 16,
        color: 'var(--editor-text-color)',
        overflowY: 'auto',
        fontFamily: 'Noto Sans, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0,
        padding: '14px 18px 14px 18px',
        paddingRight: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        maxHeight: '56vh',
        transition: 'all 0.32s cubic-bezier(0.2, 0.8, 0.4, 1)',
        transform: 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'all',
        minWidth: 300,
        marginRight: 8,
        position: 'fixed',
        right: 8,
        top: 383,
      };
  const tocItemStyles: Record<number, React.CSSProperties> = {
    1: {
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--editor-text-color)',
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
      color: 'var(--editor-text-color)',
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
      color: 'var(--editor-text-color)',
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
    // Cas page publique : scroll sur l'id dans le DOM
    const el = document.getElementById(h.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('active-flash');
      setTimeout(() => el.classList.remove('active-flash'), 1400);
      return;
    }
    // Cas éditeur (ProseMirror)
    if (containerRef?.current) {
      const proseMirrorContainer = containerRef.current.querySelector('.ProseMirror');
      if (proseMirrorContainer) {
        let el = proseMirrorContainer.querySelector(`#${CSS.escape(h.id)}`);
        if (!el) {
          const candidates = Array.from(proseMirrorContainer.querySelectorAll(`h${h.level}`)) as HTMLElement[];
          const match = candidates.find(node => node.textContent && h.text && node.textContent.trim() === h.text.trim());
          if (match) {
            match.setAttribute('id', h.id);
            el = match;
          }
        }
        if (el) {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
          (el as HTMLElement).classList.add('active-flash');
          setTimeout(() => (el as HTMLElement).classList.remove('active-flash'), 1400);
        }
      }
    }
  };

  return (
    <nav
      ref={tocRef}
      style={tocContainerStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
        {!hasHeadings ? (
          // 🚨 État vide : TOC visible mais sans contenu
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: 'var(--text-3)', 
            fontSize: '14px',
            fontStyle: 'italic',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            {isCollapsed ? (
              <div style={{ height: 12, margin: '12px 0' }} />
            ) : (
              <>
                <div>📝</div>
                <div>Aucun titre trouvé</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  Ajoutez des titres # pour voir la table des matières
                </div>
              </>
            )}
          </div>
        ) : isCollapsed ? (
          headings.map((h, idx) => {
            if (h.level === 2) {
              return <div key={h.id || `toc-bar-${idx}`} style={{ height: 3, width: 24, background: 'var(--editor-text-color)', borderRadius: 6, margin: '12px 0', marginLeft: 'auto', marginRight: 10, opacity: 0.95 }} />;
            }
            if (h.level === 3) {
              return <div key={h.id || `toc-bar-${idx}`} style={{ height: 3, width: 12, background: 'var(--editor-text-color)', borderRadius: 6, margin: '12px 0', marginLeft: 'auto', marginRight: 10, opacity: 0.95 }} />;
            }
            return <div key={h.id || `toc-bar-${idx}`} style={{ height: 12, margin: '12px 0' }} />;
          })
        ) : (
          headings.map((h, idx) => {
            const baseStyle = tocItemStyles[h.level] || tocItemStyles[3];
            let style = { ...baseStyle };
            if (currentId === h.id) {
              style = { ...style, background: 'none', color: 'var(--editor-text-color)' };
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
                    (e.currentTarget as HTMLDivElement).style.color = 'var(--accent-primary)';
                  }}
                  onMouseOut={e => {
                    if (currentId === h.id) {
                      (e.currentTarget as HTMLDivElement).style.background = 'none';
                      (e.currentTarget as HTMLDivElement).style.color = 'var(--editor-text-color)';
                    } else {
                      (e.currentTarget as HTMLDivElement).style.background = 'none';
                      (e.currentTarget as HTMLDivElement).style.color = 'var(--editor-text-color)';
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