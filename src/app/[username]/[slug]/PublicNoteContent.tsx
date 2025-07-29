'use client';

import React from 'react';
import PublicTOCClient from '@/components/PublicTOCClient';
import CraftedBadge from '@/components/CraftedBadge';
import '@/styles/typography.css'; // Importer le CSS typography

interface PublicNoteProps {
  note: {
    source_title: string;
    html_content: string;
    header_image: string | null;
    header_image_offset: number | null;
    header_image_blur: number | null;
    header_image_overlay: number | null;
    header_title_in_image: boolean | null;
    wide_mode: boolean | null;
    font_family: string | null;
  };
  slug: string;
}

export default function PublicNoteContent({ note, slug }: PublicNoteProps) {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Appliquer le mode pleine largeur
    const fullWidth = note.wide_mode ?? false;
    document.documentElement.style.setProperty(
      '--editor-content-width',
      fullWidth ? 'var(--editor-content-width-wide)' : 'var(--editor-content-width-normal)'
    );

    // Appliquer la police avec useRef
    const fontFamily = note.font_family ?? 'Noto Sans';
    
    if (titleRef.current) {
      titleRef.current.style.fontFamily = fontFamily;
    }
    if (contentRef.current) {
      contentRef.current.style.fontFamily = fontFamily;
    }
  }, [note.wide_mode, note.font_family]);

  // Déterminer la classe CSS selon la configuration
  const getLayoutClass = () => {
    if (!note.header_image) return 'noteLayout noImage';
    if (note.header_title_in_image) return 'noteLayout imageWithTitle';
    return 'noteLayout imageOnly';
  };

  return (
    <div className="public-note-container">
      <div className="public-note-header">
        {/* Le Header est déjà injecté par AppMainContent, donc rien à ajouter ici */}
      </div>
      
      {/* Image d'en-tête avec personnalisations */}
      {note.header_image && (
        <div className="public-header-image">
          <img
            src={note.header_image}
            alt="Header"
            style={{ 
              filter: `blur(${note.header_image_blur ?? 0}px)`,
              objectPosition: `center ${note.header_image_offset ?? 50}%`
            }}
            draggable={false}
          />
          {/* Overlay avec la bonne formule */}
          {note.header_image_overlay && note.header_image_overlay > 0 && (
            <div 
              className="public-header-overlay"
              style={{
                backgroundColor: `rgba(24,24,24,${0.08 + 0.14 * note.header_image_overlay})`
              }} 
            />
          )}
        </div>
      )}
      
      <div className={getLayoutClass()}>
        <div className="public-note-content-wrapper">
          {/* Titre principal (seulement si pas dans l'image) */}
          {!note.header_title_in_image && (
            <div className="noteLayout-title">
              <h1 
                ref={titleRef}
                style={{
                  fontFamily: note.font_family ?? 'Noto Sans',
                }}
              >
                {note.source_title}
              </h1>
            </div>
          )}
          
          {/* Titre dans l'image si activé - maintenant dans le bon layout */}
          {note.header_title_in_image && (
            <div className="noteLayout-title">
              <h1 style={{
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                fontFamily: note.font_family ?? 'Noto Sans',
              }}>
                {note.source_title}
              </h1>
            </div>
          )}
          
          <div className="noteLayout-content">
            <div
              ref={contentRef}
              className="editor-content markdown-body"
              style={{
                fontFamily: note.font_family ?? 'Noto Sans',
              }}
              dangerouslySetInnerHTML={{ __html: note.html_content || '' }}
            />
          </div>
        </div>
        {/* TOC sticky tout à droite */}
        <div className="public-toc-container">
          <PublicTOCClient slug={slug} />
        </div>
      </div>
      {/* Footer discret */}
      <CraftedBadge />
    </div>
  );
} 