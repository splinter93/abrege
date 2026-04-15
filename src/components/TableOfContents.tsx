import React, { useState, useRef, useEffect, useCallback } from 'react';
import './editor/toc.css';

const TOC_LEAVE_MS = 220;

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
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current !== null) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearLeaveTimer();
    setHovered(true);
  }, [clearLeaveTimer]);

  const handleMouseLeave = useCallback(() => {
    clearLeaveTimer();
    leaveTimerRef.current = setTimeout(() => {
      leaveTimerRef.current = null;
      setHovered(false);
    }, TOC_LEAVE_MS);
  }, [clearLeaveTimer]);

  useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer]);

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
    // Stratégie 1 : Chercher dans le container (ProseMirror ou markdown-body)
    if (containerRef?.current) {
      // Chercher dans ProseMirror (mode édition) OU markdown-body (mode lecture)
      const proseMirrorContainer = containerRef.current.querySelector('.ProseMirror');
      const markdownBodyContainer = containerRef.current.querySelector('.markdown-body');
      const container = proseMirrorContainer || markdownBodyContainer;
      
      if (container) {
        // Chercher par ID d'abord
        let el = container.querySelector(`#${CSS.escape(h.id)}`);
        
        // Si pas d'ID, chercher par texte et assigner l'ID
        if (!el) {
          const candidates = Array.from(container.querySelectorAll(`h${h.level}`)) as HTMLElement[];
          const match = candidates.find(node => node.textContent && h.text && node.textContent.trim() === h.text.trim());
          if (match) {
            match.setAttribute('id', h.id);
            el = match;
          }
        }
        
        if (el) {
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
    }
    
    // Stratégie 2 : Fallback sur document.getElementById (page publique ou erreur)
    const el = document.getElementById(h.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      ref={tocRef}
      className={tocContainerClass}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
            // ✅ FIX: Clé unique en combinant ID et index pour éviter les doublons
            const uniqueKey = h.id ? `toc-bar-${h.id}-${idx}` : `toc-bar-${idx}`;
            if (h.level === 2) {
              return <div key={uniqueKey} className="toc-bar toc-bar-h2" />;
            }
            if (h.level === 3) {
              return <div key={uniqueKey} className="toc-bar toc-bar-h3" />;
            }
            return <div key={uniqueKey} className="toc-bar-spacer" />;
          })
        ) : (
          headings.map((h, idx) => {
            const isH2 = h.level === 2;
            const prevWasH2 = idx > 0 && headings[idx - 1].level === 2;
            // ✅ FIX: Clé unique en combinant ID et index pour éviter les doublons
            const uniqueKey = h.id ? `toc-item-${h.id}-${idx}` : `toc-item-${idx}`;
            return (
              <React.Fragment key={uniqueKey}>
                {/* Séparateur avant chaque h2 (sauf le premier) */}
                {isH2 && idx > 0 && (
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