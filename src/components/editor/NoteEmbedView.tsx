/**
 * React NodeView pour l'affichage des note embeds
 * 
 * Fonctionnalités:
 * - Fetch et affichage contenu complet de la note
 * - Loading skeleton pendant chargement
 * - Error state si note privée/supprimée
 * - Navigation vers note au click
 * - Limite profondeur (affiche link si depth >= 3)
 * 
 * Standard GAFAM: < 200 lignes, TypeScript strict, responsive
 */

import React, { useCallback } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useNoteEmbedMetadata } from '@/hooks/useNoteEmbedMetadata';
import { useEmbedDepth } from '@/contexts/EmbedDepthContext';
import { MAX_EMBED_DEPTH } from '@/types/noteEmbed';
import { useRouter } from 'next/navigation';
import { simpleLogger as logger } from '@/utils/logger';
import '@/styles/note-embed.css';

interface NoteEmbedViewProps extends NodeViewProps {
  node: NodeViewProps['node'];
}

const NoteEmbedViewComponent: React.FC<NoteEmbedViewProps> = ({ node, getPos }) => {
  const router = useRouter();
  const { depth: contextDepth, isMaxDepthReached } = useEmbedDepth();
  
  const noteRef = node.attrs.noteRef as string;
  const embedDepth = (node.attrs.depth as number) || 0;
  
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
    router.push(url);
  }, [note, noteRef, embedDepth, router]);

  /**
   * Menu contextuel au clic droit
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // ✅ Récupérer la position réelle du node dans le document
    const pos = typeof getPos === 'function' ? getPos() : 0;
    
    // Déclencher l'événement custom pour ouvrir le menu contextuel Scrivia
    const customEvent = new CustomEvent('tiptap-context-menu', {
      detail: {
        coords: { x: e.clientX, y: e.clientY },
        nodeType: 'noteEmbed',
        hasSelection: false,
        position: pos
      }
    });
    
    document.dispatchEvent(customEvent);
  }, [getPos]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER - Profondeur max atteinte
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (embedDepth >= MAX_EMBED_DEPTH || isMaxDepthReached()) {
    return (
      <NodeViewWrapper 
        className="note-embed note-embed--max-depth"
        contentEditable={false}
        draggable={false}
        onContextMenu={handleContextMenu}
      >
        <div className="note-embed__max-depth-warning">
          <span className="note-embed__icon">🔗</span>
          <span className="note-embed__text">
            Profondeur max atteinte - <a href="#" onClick={handleClick}>Voir la note</a>
          </span>
        </div>
      </NodeViewWrapper>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER - Loading
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (loading) {
    return (
      <NodeViewWrapper 
        className="note-embed note-embed--loading"
        contentEditable={false}
        draggable={false}
        onContextMenu={handleContextMenu}
      >
        <div className="note-embed__skeleton">
          <div className="note-embed__skeleton-header" />
          <div className="note-embed__skeleton-title" />
          <div className="note-embed__skeleton-content" />
          <div className="note-embed__skeleton-footer" />
        </div>
      </NodeViewWrapper>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER - Error
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (error || !note) {
    return (
      <NodeViewWrapper 
        className="note-embed note-embed--error"
        contentEditable={false}
        draggable={false}
        onContextMenu={handleContextMenu}
      >
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
      </NodeViewWrapper>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER - Success (contenu complet de la note)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Truncate contenu si trop long (perf)
  const contentPreview = note.markdown_content.length > 2000
    ? note.markdown_content.substring(0, 2000) + '\n\n...'
    : note.markdown_content;

  return (
    <NodeViewWrapper 
      className="note-embed note-embed--success"
      contentEditable={false}
      draggable={false}
      onContextMenu={handleContextMenu}
    >
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
    </NodeViewWrapper>
  );
};

// ✅ Wrapper avec React.memo pour éviter l'erreur flushSync avec React 18
const NoteEmbedView = React.memo(NoteEmbedViewComponent);

export default NoteEmbedView;

