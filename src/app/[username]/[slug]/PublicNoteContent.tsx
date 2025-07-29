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
    <div style={{ width: '100vw', minHeight: '100vh', background: '#121217', color: '#D4D4D4', paddingBottom: 64 }}>
      <div style={{ width: '100%', background: '#323236', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {/* Le Header est déjà injecté par AppMainContent, donc rien à ajouter ici */}
      </div>
      
      {/* Image d'en-tête avec personnalisations */}
      {note.header_image && (
        <div style={{ 
          width: '100%', 
          height: 300, // Hauteur fixe comme dans l'éditeur
          overflow: 'hidden', 
          marginBottom: 32,
          position: 'relative'
        }}>
          <img
            src={note.header_image}
            alt="Header"
            style={{ 
              width: '100%', 
              height: '100%', // Utiliser toute la hauteur
              objectFit: 'cover', 
              borderRadius: 0,
              filter: `blur(${note.header_image_blur ?? 0}px)`,
              objectPosition: `center ${note.header_image_offset ?? 50}%` // Utiliser objectPosition au lieu de transform
            }}
            draggable={false}
          />
          {/* Overlay avec la bonne formule */}
          {note.header_image_overlay && note.header_image_overlay > 0 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(24,24,24,${0.08 + 0.14 * note.header_image_overlay})` // Formule exacte de l'éditeur
            }} />
          )}
          
          {/* Titre dans l'image si activé - utiliser les classes CSS */}
          {note.header_title_in_image && (
            <div className="noteLayout-title" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'auto',
              maxWidth: '750px',
              padding: 0,
              boxSizing: 'border-box',
              textAlign: 'center',
              zIndex: 10
            }}>
              <h1 style={{
                fontSize: 'var(--editor-title-size)',
                fontWeight: 700,
                margin: 0,
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                fontFamily: note.font_family ?? 'Noto Sans',
                textAlign: 'center',
                width: 'auto',
                maxWidth: '750px',
                padding: '0 0 4px 0',
                whiteSpace: 'pre-wrap',
                overflow: 'visible'
              }}>
                {note.source_title}
              </h1>
            </div>
          )}
        </div>
      )}
      
      <div className={getLayoutClass()} style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', margin: '0 auto', marginBottom: 32, gap: 32, position: 'relative' }}>
        <div data-main-content style={{ maxWidth: 'var(--editor-content-width)', width: 'var(--editor-content-width)' }}>
          {/* Titre principal (seulement si pas dans l'image) */}
          {!note.header_title_in_image && (
            <div className="noteLayout-title">
              <h1 
                ref={titleRef}
                style={{
                  fontSize: 'var(--editor-title-size)',
                  fontWeight: 700,
                  color: 'var(--editor-text-color)',
                  margin: 0,
                  padding: 0,
                  textAlign: 'left',
                  maxWidth: 'var(--editor-content-width)',
                  width: 'var(--editor-content-width)',
                  lineHeight: 1.1,
                  fontFamily: note.font_family ?? 'Noto Sans',
                }}
              >
                {note.source_title}
              </h1>
            </div>
          )}
          
          <div className="noteLayout-content">
            <div
              ref={contentRef}
              className="markdown-body"
              style={{
                maxWidth: 'var(--editor-content-width)',
                width: 'var(--editor-content-width)',
                margin: '0 auto',
                background: 'none',
                padding: '0 0 64px 0',
                fontSize: 'var(--editor-body-size)',
                color: 'var(--editor-text-color)',
                minHeight: '60vh',
                pointerEvents: 'auto',
                userSelect: 'text',
                fontFamily: note.font_family ?? 'Noto Sans',
              }}
              dangerouslySetInnerHTML={{ __html: note.html_content || '' }}
            />
          </div>
        </div>
        {/* TOC sticky tout à droite */}
        <div style={{ position: 'fixed', top: 380, right: 0, paddingRight: 0, minWidth: 220, maxWidth: 320, zIndex: 20 }}>
          <PublicTOCClient slug={slug} />
        </div>
      </div>
      {/* Footer discret */}
      <CraftedBadge />
    </div>
  );
} 