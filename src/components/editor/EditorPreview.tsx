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
    container: containerRef.current,
    noteId
  });

  const { setupEventListeners } = usePreviewEventListeners({
    container: containerRef.current
  });

  // Attacher les event listeners et rendre mermaid en readonly
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // CRITIQUE: Attendre que le HTML soit disponible (important pour pages publiques)
    if (!html || html.trim() === '' || html === '<div class="markdown-loading">Chargement...</div>') {
      // HTML pas encore prêt, réessayer plus tard
      return; // Le useEffect se re-déclenchera quand html changera (dépendance)
    }
    
    // Vérifier que le HTML contient bien des blocs Mermaid avant de chercher dans le DOM
    const htmlContainsMermaid = html.includes('u-block--mermaid') && html.includes('data-mermaid="true"');
    if (!htmlContainsMermaid) {
      // Pas de blocs Mermaid dans le HTML, rien à faire
      return;
    }
    
    // DEBUG: Logger pour diagnostiquer les pages publiques
    if (process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, '[EditorPreview] useEffect déclenché', {
        hasHtml: !!html,
        htmlLength: html?.length || 0,
        htmlHash,
        lastHash: lastHtmlHashRef.current,
        hasContainer: !!container,
        htmlContainsMermaid: html?.includes('u-block--mermaid') || false,
        context: { noteId, operation: 'previewRender' }
      });
    }
    
    // Si le HTML n'a pas vraiment changé (même hash), juste vérifier les blocs Mermaid
    if (htmlHash === lastHtmlHashRef.current && lastHtmlHashRef.current !== '') {
      // HTML identique, vérifier si les blocs Mermaid sont toujours rendus
      if (container) {
        const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
        if (mermaidBlocks.length > 0) {
          const needsRendering = Array.from(mermaidBlocks).some(block => {
            const body = block.querySelector('.u-block__body') as HTMLElement;
            if (!body) return true;
            const svgContainer = body.querySelector('.mermaid-svg-container');
            const hasValidSvg = svgContainer && svgContainer.innerHTML.trim() !== '' && svgContainer.querySelector('svg');
            return !hasValidSvg;
          });
          
          // Si des blocs sont vides, les re-rendre sans réinjecter le HTML
          if (needsRendering) {
            setTimeout(() => {
              renderMermaidBlocks(0).then(() => {
                setupEventListeners();
              }).catch(() => {
                setupEventListeners();
              });
            }, 100);
          }
        }
      }
      // Ne pas réinjecter le HTML si identique
      return;
    }
    
    // Mettre à jour la référence du hash
    lastHtmlHashRef.current = htmlHash;
    
    // Exécuter immédiatement pour vérifier les blocs existants
    checkAndRenderMermaid();
    
    // Utiliser MutationObserver pour détecter quand de nouveaux blocs sont ajoutés
    const observer = new MutationObserver(() => {
      // Vérifier si des blocs Mermaid ont été ajoutés
      const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      if (mermaidBlocks.length > 0) {
        // Vérifier si certains blocs ne sont pas encore rendus
        const needsRendering = Array.from(mermaidBlocks).some(block => {
          const body = block.querySelector('.u-block__body') as HTMLElement;
          return body && !body.querySelector('.mermaid-svg-container');
        });
        
        if (needsRendering) {
          observer.disconnect();
          renderMermaidBlocks().then(() => {
            setTimeout(() => {
              setupEventListeners();
            }, 50);
          }).catch(() => {
            setupEventListeners();
          });
        }
      }
    });
    
    // Observer les changements dans le conteneur
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    
    // Fallback : exécuter aussi après plusieurs délais pour gérer les cas où le HTML est injecté plus tard
    const timeoutId1 = setTimeout(() => {
      checkAndRenderMermaid(0);
    }, 200);
    
    const timeoutId2 = setTimeout(() => {
      checkAndRenderMermaid(2);
    }, 1000);
    
    const timeoutId3 = setTimeout(() => {
      observer.disconnect();
      checkAndRenderMermaid(4);
    }, 3000);
    
    // Vérification périodique pour les cas où les blocs sont vidés après le rendu initial
    const periodicCheck = setInterval(() => {
      if (!container) {
        clearInterval(periodicCheck);
        return;
      }
      const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      if (mermaidBlocks.length > 0) {
        const needsRendering = Array.from(mermaidBlocks).some(block => {
          const body = block.querySelector('.u-block__body') as HTMLElement;
          if (!body) return false;
          const svgContainer = body.querySelector('.mermaid-svg-container');
          const hasValidSvg = svgContainer && svgContainer.innerHTML.trim() !== '' && svgContainer.querySelector('svg');
          return !hasValidSvg;
        });
        if (needsRendering) {
          // Appeler renderMermaidBlocks directement pour re-rendre les blocs vides
          renderMermaidBlocks(0).then(() => {
            setupEventListeners();
          }).catch(() => {
            setupEventListeners();
          });
        }
      }
    }, 2000); // Vérifier toutes les 2 secondes
    
    // Nettoyage au démontage
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearInterval(periodicCheck);
    };
    
  }, [html, containerRef, noteId, htmlHash, renderMermaidBlocks, checkAndRenderMermaid, setupEventListeners]);

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
  }, [html]);

  return (
    <>
      <div 
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="markdown-body editor-content-wrapper" 
        key={`html-${htmlHash}`} // Clé basée sur le hash pour éviter réinjections inutiles
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
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
