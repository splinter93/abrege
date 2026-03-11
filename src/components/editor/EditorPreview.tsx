/**
 * EditorPreview - Mode readonly avec rendu HTML et Mermaid
 * 
 * Responsabilités:
 * - Rendu HTML en mode readonly
 * - Rendu des diagrammes Mermaid
 * - Hydratation des note embeds
 * - Event listeners (copy buttons, expand buttons)
 */

import React, { useEffect, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { NoteEmbedHydrator } from './NoteEmbedHydrator';
import { logger, LogCategory } from '@/utils/logger';
import { useMermaidRenderer } from '@/hooks/editor/useMermaidRenderer';
import { usePreviewEventListeners } from '@/hooks/editor/usePreviewEventListeners';
import { openImageModal } from '@/components/chat/ImageModal';
import { openMermaidModal } from '@/components/mermaid/MermaidModal';

interface EditorPreviewProps {
  html: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  noteId?: string;
}

const EditorPreview: React.FC<EditorPreviewProps> = ({
  html,
  containerRef,
  noteId
}) => {
  // Ref pour tracker le hash du dernier HTML injecté et éviter les réinjections inutiles
  const lastHtmlHashRef = useRef<string>('');
  
  // Calculer un hash simple du HTML pour détecter les vrais changements
  const htmlHash = useMemo(() => {
    if (!html) return '';
    // Hash simple basé sur la longueur et quelques caractères clés
    return `${html.length}-${html.substring(0, 100).replace(/\s/g, '')}`;
  }, [html]);

  // Hooks pour Mermaid et event listeners
  const { renderMermaidBlocks, checkAndRenderMermaid } = useMermaidRenderer({
    containerRef,
    noteId
  });

  const { setupEventListeners } = usePreviewEventListeners({
    container: containerRef.current
  });

  // Rendre les blocs Mermaid et attacher les event listeners après chaque injection HTML
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    if (!html || html.trim() === '' || html === '<div class="markdown-loading">Chargement...</div>') {
      return;
    }

    const htmlContainsMermaid = html.includes('u-block--mermaid') && html.includes('data-mermaid="true"');
    if (!htmlContainsMermaid) {
      setupEventListeners();
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, '[EditorPreview] Rendu Mermaid déclenché', {
        htmlLength: html.length,
        noteId,
        context: { operation: 'mermaidRender' }
      });
    }

    // MutationObserver : déclenche le rendu dès que les blocs apparaissent dans le DOM
    const observer = new MutationObserver(() => {
      const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      const needsRendering = Array.from(mermaidBlocks).some(block => {
        const body = block.querySelector('.u-block__body') as HTMLElement;
        return body && !body.querySelector('.mermaid-svg-container');
      });
      if (needsRendering) {
        observer.disconnect();
        renderMermaidBlocks().then(() => setupEventListeners()).catch(() => setupEventListeners());
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    // Appel immédiat : les blocs peuvent déjà être dans le DOM (injection synchrone)
    checkAndRenderMermaid();

    // Fallbacks pour les cas de rendu différé
    const t1 = setTimeout(() => checkAndRenderMermaid(0), 300);
    const t2 = setTimeout(() => {
      observer.disconnect();
      checkAndRenderMermaid(2);
      setupEventListeners();
    }, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [html, containerRef, noteId, renderMermaidBlocks, checkAndRenderMermaid, setupEventListeners]);

  // ✅ Gestionnaire de clic sur les images en mode preview
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        e.stopPropagation();
        
        const imgSrc = target.getAttribute('src');
        const imgAlt = target.getAttribute('alt');
        
        if (imgSrc) {
          openImageModal({
            src: imgSrc,
            alt: imgAlt || undefined
          });
        }
      }
    };

    // Ajouter le listener sur le container
    container.addEventListener('click', handleImageClick);

    // Ajouter un style cursor pointer aux images pour indiquer qu'elles sont cliquables
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      (img as HTMLElement).style.cursor = 'pointer';
      if (!(img as HTMLElement).title) {
        (img as HTMLElement).title = 'Cliquer pour agrandir';
      }
    });

    return () => {
      container.removeEventListener('click', handleImageClick);
    };
  }, [containerRef, html]);

  // ✅ Gestionnaire de clic sur les diagrammes Mermaid en mode preview
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMermaidClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Chercher le bloc Mermaid parent (peut être le SVG ou un élément à l'intérieur)
      const mermaidBlock = target.closest('.u-block--mermaid');
      
      if (mermaidBlock) {
        // Ignorer les clics sur les boutons de la toolbar
        if (target.closest('.u-block__toolbar')) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        // Récupérer le contenu Mermaid depuis l'attribut data-mermaid-content ou depuis pre code
        const mermaidBody = mermaidBlock.querySelector('.u-block__body') as HTMLElement;
        const mermaidContent = mermaidBody?.dataset?.mermaidContent || 
                              mermaidBody?.querySelector('pre code')?.textContent || '';
        
        if (mermaidContent) {
          openMermaidModal(mermaidContent);
        }
      }
    };

    // Ajouter le listener sur le container
    container.addEventListener('click', handleMermaidClick);

    // Ajouter un style cursor pointer aux blocs Mermaid pour indiquer qu'ils sont cliquables
    const mermaidBlocks = container.querySelectorAll('.u-block--mermaid');
    mermaidBlocks.forEach(block => {
      const body = block.querySelector('.u-block__body') as HTMLElement;
      if (body) {
        body.style.cursor = 'pointer';
        if (!body.title) {
          body.title = 'Cliquer pour agrandir';
        }
      }
    });

    return () => {
      container.removeEventListener('click', handleMermaidClick);
    };
  }, [containerRef, html]);

  // ✅ SÉCURITÉ: Sanitizer le HTML avant injection (conformité GUIDE-EXCELLENCE-CODE.md)
  const sanitizedHtml = useMemo(() => {
    if (typeof window === 'undefined') {
      return html; // SSR: pas de sanitization nécessaire
    }
    return DOMPurify.sanitize(html, {
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
        'button',
        'svg', 'path', 'rect', 'polyline',
        'note-embed', 'youtube-embed'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'class', 'id', 'style',
        'data-language', 'data-content', 'data-index', 'data-mermaid', 'data-mermaid-content',
        'colspan', 'rowspan', 'scope', 'headers',
        'width', 'height', 'align', 'valign',
        'type', 'checked', 'disabled',
        'viewbox', 'fill', 'stroke', 'stroke-width', 'd', 'x', 'y', 'rx', 'ry', 'points'
      ],
      ALLOW_DATA_ATTR: true,
      ALLOW_UNKNOWN_PROTOCOLS: false
    });
  }, [html]);

  // Injection impérative du HTML : on écrit dans le DOM directement pour que React
  // ne puisse plus écraser les SVG Mermaid injectés après coup par dangerouslySetInnerHTML.
  // On ne réinjecte que si le contenu a vraiment changé (guard sur htmlHash).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sanitizedHtml) return;
    if (htmlHash === lastHtmlHashRef.current && lastHtmlHashRef.current !== '') return;
    lastHtmlHashRef.current = htmlHash;
    container.innerHTML = sanitizedHtml;
  }, [sanitizedHtml, htmlHash, containerRef]);

  return (
    <>
      {/* Le div est vide côté React — le contenu est injecté impérativement ci-dessus */}
      <div 
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="markdown-body editor-content-wrapper" 
      />
      {/* Hydrater les note embeds en mode preview */}
      <NoteEmbedHydrator
        containerRef={containerRef as React.RefObject<HTMLElement>}
        htmlContent={html}
      />
    </>
  );
};

export default EditorPreview;
