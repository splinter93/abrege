import React, { useState, useRef } from 'react';
import './editor/toc.css';

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

  const tocContainerClass = `toc-container ${isCollapsed ? 'collapsed' : 'expanded'}`;
  const getTocItemClass = (level: number) => `toc-item toc-item-h${level}`;

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
      className={tocContainerClass}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="toc-content">
        {!hasHeadings ? (
          <div className="toc-empty-state">
            {isCollapsed ? (
              <div className="toc-empty-icon" />
            ) : (
              <div className="toc-empty-content">
                <div className="toc-empty-icon-large">📝</div>
                <div className="toc-empty-title">Aucun titre trouvé</div>
                <div className="toc-empty-subtitle">
                  Ajoutez des titres # pour voir la table des matières
                </div>
              </div>
            )}
          </div>
        ) : isCollapsed ? (
          headings.map((h, idx) => {
            if (h.level === 2) {
              return <div key={h.id || `toc-bar-${idx}`} className="toc-bar toc-bar-h2" />;
            }
            if (h.level === 3) {
              return <div key={h.id || `toc-bar-${idx}`} className="toc-bar toc-bar-h3" />;
            }
            return <div key={h.id || `toc-bar-${idx}`} className="toc-bar-spacer" />;
          })
        ) : (
          headings.map((h, idx) => {
            const isH2 = h.level === 2;
            const prevIsH2 = idx > 0 && headings[idx - 1].level === 2;
            return (
              <React.Fragment key={h.id || `toc-item-${idx}`}>
                {isH2 && idx > 0 && !prevIsH2 && (
                  <hr className="toc-separator" />
                )}
                <button
                  onClick={() => handleHeadingClick(h)}
                  className={`${getTocItemClass(h.level)} ${currentId === h.id ? 'active' : ''}`}
                  title={h.text}
                >
                  {h.text}
                </button>
              </React.Fragment>
            );
          })
        )}
      </div>
    </nav>
  );
} 