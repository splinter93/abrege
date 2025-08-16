'use client';

import React from 'react';
import PublicTOCClient from '@/components/PublicTOCClient';
import CraftedBadge from '@/components/CraftedBadge';
import '@/styles/public-note.css'; // CSS spécifique page publique - PRIORITÉ MAXIMALE
import '@/styles/typography.css'; // Importer le CSS typography
import '@/styles/design-system.css'; // Importer le design system pour les variables

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
    
    // Forcer le thème sombre sur la page publique - IMMÉDIATEMENT
    document.documentElement.classList.add('public-note-page');
    document.body.classList.add('public-note-page');
    
    // Forcer le background sombre directement sur le DOM
    document.documentElement.style.backgroundColor = '#141414';
    document.documentElement.style.background = '#141414';
    document.body.style.backgroundColor = '#141414';
    document.body.style.background = '#141414';
    
    // Cleanup lors du démontage
    return () => {
      document.documentElement.classList.remove('public-note-page');
      document.body.classList.remove('public-note-page');
      document.documentElement.style.backgroundColor = '';
      document.documentElement.style.background = '';
      document.body.style.backgroundColor = '';
      document.body.style.background = '';
    };
  }, [note.wide_mode]);

  // Déterminer la classe CSS selon la configuration
  const getLayoutClass = () => {
    if (!note.header_image) return 'noteLayout noImage';
    if (note.header_title_in_image) return 'noteLayout imageWithTitle';
    return 'noteLayout imageOnly';
  };

  return (
    <div 
      className="public-note-container"
      style={{
        backgroundColor: '#141414',
        background: '#141414',
        color: '#F5F5DC'
      }}
    >
      {/* Le Header est déjà injecté par AppMainContent */}
      
      {/* Image d'en-tête avec personnalisations */}
      {note.header_image && (
        <div className="public-header-image">
          <img
            src={note.header_image}
            alt="Header"
            style={{ 
              filter: `blur(${note.header_image_blur ?? 0}px)`,
              objectPosition: `center ${note.header_image_offset ?? 50}%`,
              transition: 'filter 0.2s'
            }}
            draggable={false}
          />
          {/* Overlay avec la formule exacte de l'éditeur */}
          {note.header_image_overlay && note.header_image_overlay > 0 && (
            <div 
              className="public-header-overlay"
              style={{
                backgroundColor: `rgba(24,24,24,${0.08 + 0.14 * note.header_image_overlay})`
              }} 
            />
          )}
          
          {/* Titre dans l'image si activé - maintenant dans le conteneur de l'image */}
          {note.header_title_in_image && (
            <div className="public-header-title">
              <h1 className={note.font_family ? `font-${note.font_family.replace(/\s+/g, '-').toLowerCase()}` : 'font-noto-sans'}>
                {note.source_title}
              </h1>
            </div>
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
                className={note.font_family ? `font-${note.font_family.replace(/\s+/g, '-').toLowerCase()}` : 'font-noto-sans'}
              >
                {note.source_title}
              </h1>
            </div>
          )}
          
          <div className="noteLayout-content">
            <div
              ref={contentRef}
              className={`editor-content markdown-body ${note.font_family ? `font-${note.font_family.replace(/\s+/g, '-').toLowerCase()}` : 'font-noto-sans'}`}
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