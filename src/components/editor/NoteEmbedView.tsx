/**
 * React NodeView pour l'affichage des note embeds
 * 
 * Fonctionnalités:
 * - Multi-styles (card, inline, compact)
 * - Fetch et affichage contenu complet de la note
 * - Loading skeleton pendant chargement
 * - Error state si note privée/supprimée
 * - Navigation vers note au click
 * - Limite profondeur (affiche link si depth >= 3)
 * 
 * Standard GAFAM: TypeScript strict, responsive, composants séparés
 */

import React, { useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useNoteEmbedMetadata } from '@/hooks/useNoteEmbedMetadata';
import { useEmbedDepth } from '@/contexts/EmbedDepthContext';
import { MAX_EMBED_DEPTH, type NoteEmbedDisplayStyle } from '@/types/noteEmbed';
import { useRouter } from 'next/navigation';
import NoteEmbedInline from './NoteEmbedInline';
import '@/styles/note-embed.css';

interface NoteEmbedViewProps extends NodeViewProps {
  node: NodeViewProps['node'];
}

const NoteEmbedViewComponent: React.FC<NoteEmbedViewProps> = ({ node, getPos }) => {
  const router = useRouter();
  const { isMaxDepthReached } = useEmbedDepth();
  
  const noteRef = node.attrs.noteRef as string;
  const noteTitle = node.attrs.noteTitle as string | null | undefined;
  const embedDepth = (node.attrs.depth as number) || 0;
  const displayAttr = (node.attrs.display as NoteEmbedDisplayStyle) || 'inline';
  const normalizedDisplay: NoteEmbedDisplayStyle = ['card', 'inline', 'compact'].includes(displayAttr)
    ? displayAttr
    : 'inline';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HOOKS — tous déclarés ici, avant tout early return (Rules of Hooks)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const isCardMode = normalizedDisplay === 'card';

  // Fetch uniquement en mode card
  const { note, loading, error } = useNoteEmbedMetadata({
    noteRef,
    depth: embedDepth,
    enabled: isCardMode && !isMaxDepthReached()
  });

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!note) return;
    const url = note.public_url || `/private/note/${note.id}`;
    router.push(url);
  }, [note, router]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = typeof getPos === 'function' ? getPos() : 0;
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

  // ✅ SÉCURITÉ: Sanitizer le HTML avant injection — guard sur note null
  const sanitizedHtml = useMemo(() => {
    if (!note?.html_content) return '';
    if (typeof window === 'undefined') {
      return note.html_content; // SSR: pas de sanitization nécessaire
    }
    return DOMPurify.sanitize(note.html_content, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'b', 'i', 's', 'del', 'ins',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'blockquote', 'q', 'cite',
        'code', 'pre', 'kbd', 'samp', 'var',
        'a', 'img', 'figure', 'figcaption',
        'div', 'span', 'section', 'article', 'aside', 'header', 'footer',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
        'hr', 'br',
        'input', 'label',
        'note-embed', 'youtube-embed'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id', 'style',
        'data-language', 'data-content', 'data-index', 'data-mermaid', 'data-mermaid-content',
        'colspan', 'rowspan', 'scope', 'headers',
        'width', 'height', 'align', 'valign',
        'type', 'checked', 'disabled'
      ],
      ALLOW_DATA_ATTR: true,
      ALLOW_UNKNOWN_PROTOCOLS: false
    });
  }, [note?.html_content]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ROUTING - Style inline (mention) — après tous les hooks
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  if (normalizedDisplay === 'inline' || normalizedDisplay === 'compact') {
     return (
      <NodeViewWrapper 
        as="div"
        className="note-embed-inline-wrapper"
        contentEditable={false}
        draggable={false}
      >
        <NoteEmbedInline noteRef={noteRef} noteTitle={noteTitle} />
      </NodeViewWrapper>
    );
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER CARD - Profondeur max atteinte
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
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

// ✅ Wrapper avec React.memo pour éviter l'erreur flushSync avec React 18
const NoteEmbedView = React.memo(NoteEmbedViewComponent);

export default NoteEmbedView;

