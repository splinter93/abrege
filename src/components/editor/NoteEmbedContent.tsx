/**
 * Composant partagé pour l'affichage du contenu d'un note embed
 * Utilisé à la fois en mode édition (avec NodeViewWrapper) et en preview (standalone)
 */

import React, { useCallback } from 'react';
import { useNoteEmbedMetadata } from '@/hooks/useNoteEmbedMetadata';
import { useEmbedDepth } from '@/contexts/EmbedDepthContext';
import { MAX_EMBED_DEPTH } from '@/types/noteEmbed';
import '@/styles/note-embed.css';

interface NoteEmbedContentProps {
  noteRef: string;
  embedDepth?: number;
  /** Si true, wrap dans un div simple (pour preview), sinon utilise NodeViewWrapper (pour édition) */
  standalone?: boolean;
}

const NoteEmbedContent: React.FC<NoteEmbedContentProps> = ({
  noteRef,
  embedDepth = 0,
  standalone = false,
}) => {
  const { depth: contextDepth, isMaxDepthReached } = useEmbedDepth();
  
  // Fetch metadata avec cache
  const { note, loading, error } = useNoteEmbedMetadata({
    noteRef,
    depth: embedDepth,
    enabled: !isMaxDepthReached()
  });

  /**
   * Navigation vers la note au click
   */
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!note) return;

    // Navigation vers l'URL publique ou éditeur privé
    const url = note.public_url || `/private/note/${note.id}`;
    
    // ✅ En mode standalone (preview), utiliser window.location au lieu de useRouter
    if (standalone) {
      window.location.href = url;
    } else {
      // En mode édition avec Tiptap, on ne peut pas naviguer (useRouter n'est pas dispo ici non plus)
      // Juste ouvrir dans un nouvel onglet
      window.open(url, '_blank');
    }
  }, [note, standalone]);

  /**
   * Menu contextuel au clic droit (mode preview seulement)
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // En mode preview, juste empêcher le menu navigateur
    // (pas de menu contextuel Scrivia en mode readonly)
  }, []);

  // Wrapper conditionnel
  const Wrapper = standalone ? 'div' : React.Fragment;
  const wrapperProps = standalone 
    ? { className: 'note-embed note-embed--standalone' }
    : {};

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER - Profondeur max atteinte
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (embedDepth >= MAX_EMBED_DEPTH || isMaxDepthReached()) {
    return (
      <Wrapper {...wrapperProps}>
        <div className="note-embed note-embed--max-depth">
          <div className="note-embed__max-depth-warning">
            <span className="note-embed__icon">🔗</span>
            <span className="note-embed__text">
              Profondeur max atteinte - <a href="#" onClick={handleClick}>Voir la note</a>
            </span>
          </div>
        </div>
      </Wrapper>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER - Loading
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (loading) {
    return (
      <Wrapper {...wrapperProps}>
        <div className="note-embed note-embed--loading">
          <div className="note-embed__skeleton">
            <div className="note-embed__skeleton-header" />
            <div className="note-embed__skeleton-title" />
            <div className="note-embed__skeleton-content" />
            <div className="note-embed__skeleton-footer" />
          </div>
        </div>
      </Wrapper>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER - Error
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (error || !note) {
    return (
      <Wrapper {...wrapperProps}>
        <div className="note-embed note-embed--error">
          <div className="note-embed__error">
            <div className="note-embed__error-icon">❌</div>
            <div className="note-embed__error-content">
              <div className="note-embed__error-title">Note indisponible</div>
              <div className="note-embed__error-message">
                {error === 'Accès refusé' ? 'Cette note est privée' : error || 'Note introuvable'}
              </div>
              <div className="note-embed__error-ref">{noteRef}</div>
            </div>
          </div>
        </div>
      </Wrapper>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER - Success (contenu complet de la note)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <Wrapper {...wrapperProps}>
      <div className="note-embed note-embed--success">
        <div 
          className="note-embed__card"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick(e as unknown as React.MouseEvent);
            }
          }}
        >
          {/* Header Image */}
          {note.header_image && (
            <div className="note-embed__header-image">
              <img 
                src={note.header_image} 
                alt={note.title}
                loading="lazy"
                draggable={false}
              />
            </div>
          )}

          {/* Contenu */}
          <div className="note-embed__content">
            {/* Titre avec profondeur à droite */}
            <div className="note-embed__title">
              <div className="note-embed__title-left">
                <span className="note-embed__icon">📄</span>
                <h3>{note.title}</h3>
              </div>
              <span className="note-embed__depth">
                Profondeur {embedDepth + 1}/{MAX_EMBED_DEPTH}
              </span>
            </div>

            {/* Contenu markdown rendu */}
            <div 
              className="note-embed__body markdown-body"
              dangerouslySetInnerHTML={{ __html: note.html_content || '' }}
            />
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

export default React.memo(NoteEmbedContent);

