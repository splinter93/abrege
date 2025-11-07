"use client";
import React, { useMemo, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useMarkdownRender } from '../../hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
import MermaidRenderer from '@/components/mermaid/MermaidRenderer';
import { simpleLogger as logger } from '@/utils/logger';
import { openImageModal } from './ImageModal';
import '@/styles/mermaid.css';
import '@/styles/unified-blocks.css';

interface EnhancedMarkdownMessageProps {
  content: string;
}

// Composant séparé pour les blocs de texte avec support des code blocks
const TextBlock: React.FC<{ content: string; index: number }> = React.memo(({ content, index }) => {
  const { html } = useMarkdownRender({ content });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ✅ SÉCURITÉ: Wrapper les tableaux uniquement (les code blocks sont déjà gérés par markdownItConfig)
  const processMarkdownContent = (htmlContent: string) => {
    // Vérifier si nous sommes côté client (DOMParser n'est disponible que dans le navigateur)
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return htmlContent; // Retourner le HTML original côté serveur
    }
    
    try {
      // ✅ SÉCURITÉ: Sanitizer d'abord le contenu avant parsing (avec support des tableaux + checkboxes)
      const sanitizedContent = DOMPurify.sanitize(htmlContent, {
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
          'input', 'label', // ✅ Support des checkboxes
          'button', 'svg', 'path', 'rect', 'polyline', 'circle', 'line', 'g', 'defs', // ✅ Support toolbar + SVG
          'note-embed', 'youtube-embed'
        ],
        ALLOWED_ATTR: [
          'class', 'id', 'href', 'src', 'alt', 'title', 'style', 
          'colspan', 'rowspan', 'scope', 'headers', 'type', 'checked', 'disabled',
          'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
          'x', 'y', 'rx', 'ry', 'd', 'points', 'x1', 'y1', 'x2', 'y2',
          'data-language', 'data-content', 'data-mermaid', 'data-mermaid-content'
        ],
        ALLOW_DATA_ATTR: true // ✅ CRITIQUE: Autoriser data-* sinon les wrappers perdent leurs attributs !
      });
      
      // Créer un DOM parser temporaire avec contenu sanitizé
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedContent, 'text/html');
      
      // ✅ Wrapper les tableaux pour le scroll horizontal
      const tables = doc.querySelectorAll('table');
      tables.forEach((table) => {
        // Créer un wrapper avec overflow
        const wrapper = doc.createElement('div');
        wrapper.className = 'table-wrapper-chat';
        
        // Wrapper le tableau
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });
      
      // ✅ Les code blocks sont déjà gérés par markdownItConfig.ts (custom fence renderer)
      // Pas besoin de transformation supplémentaire ici
      
      return doc.body.innerHTML;
    } catch (error) {
      logger.error('Erreur lors du traitement des code blocks:', error);
      // ✅ SÉCURITÉ: Fallback sécurisé en cas d'erreur (avec support des tableaux + checkboxes)
      return DOMPurify.sanitize(htmlContent, {
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
          'input', 'label', // ✅ Support des checkboxes
          'button', 'svg', 'path', 'rect', 'polyline', 'circle', 'line', 'g', 'defs', // ✅ Support toolbar + SVG
          'note-embed', 'youtube-embed'
        ],
        ALLOWED_ATTR: [
          'class', 'id', 'href', 'src', 'alt', 'title', 'style', 
          'colspan', 'rowspan', 'scope', 'headers', 'type', 'checked', 'disabled',
          'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
          'x', 'y', 'rx', 'ry', 'd', 'points', 'x1', 'y1', 'x2', 'y2'
        ],
        ALLOW_DATA_ATTR: true
      });
    }
  };
  
  // ✅ SÉCURITÉ: Wrapper les tableaux uniquement (code blocks déjà gérés par markdown-it)
  const processedHtml = processMarkdownContent(html);
  const sanitizedHtml = DOMPurify.sanitize(processedHtml, {
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
      'input', 'label', // ✅ Support des checkboxes
      'button', 'svg', 'path', 'rect', 'polyline', 'circle', 'line', 'g', 'defs', // ✅ Support toolbar + SVG
      'note-embed', 'youtube-embed'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'data-language', 'data-content', 'data-index', 'data-mermaid', 'data-mermaid-content',
      'colspan', 'rowspan', 'scope', 'headers',
      'width', 'height', 'align', 'valign',
      'type', 'checked', 'disabled',
      'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
      'x', 'y', 'rx', 'ry', 'd', 'points', 'x1', 'y1', 'x2', 'y2',
      'cx', 'cy', 'r', 'transform' // ✅ Attributs SVG supplémentaires
    ],
    ALLOW_DATA_ATTR: true,
    ALLOW_UNKNOWN_PROTOCOLS: false
  });

  // 🖼️ Intercepter les double-clics sur les images du markdown
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleImageDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
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
    container.addEventListener('dblclick', handleImageDoubleClick);

    // Ajouter un style cursor pointer aux images
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      (img as HTMLElement).style.cursor = 'pointer';
      (img as HTMLElement).title = 'Double-cliquer pour agrandir';
    });

    return () => {
      container.removeEventListener('dblclick', handleImageDoubleClick);
    };
  }, [sanitizedHtml]);

  // 🔗 Intercepter les clics sur les liens vers images
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // 🎯 Remonter l'arbre DOM pour trouver le lien <a> parent
      const linkElement = target.closest('a');
      
      if (linkElement) {
        const href = linkElement.getAttribute('href');
        if (href) {
          // 🎯 Détecter si le lien pointe vers une image
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
          const isImageLink = imageExtensions.some(ext => 
            href.toLowerCase().endsWith(ext) || href.toLowerCase().includes(ext + '?')
          );

          if (isImageLink) {
            e.preventDefault(); // Empêcher la navigation
            e.stopPropagation(); // Empêcher la propagation
            openImageModal({
              src: href,
              alt: linkElement.textContent || undefined
            });
          }
        }
      }
    };

    // Ajouter le listener sur le container
    container.addEventListener('click', handleLinkClick);

    return () => {
      container.removeEventListener('click', handleLinkClick);
    };
  }, [sanitizedHtml]);
  
  // ✅ Gérer les clics sur les boutons copy après le render
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleCopyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.toolbar-btn.copy-btn') as HTMLButtonElement;
      if (!button) return;

      e.preventDefault();
      e.stopPropagation();

      const content = button.getAttribute('data-content');
      if (!content) return;

      try {
        // Décoder les entités HTML
        const decoded = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        await navigator.clipboard.writeText(decoded);
        
        // Changer icône en checkmark
        const originalHTML = button.innerHTML;
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        `;
        button.classList.add('copied');
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        logger.error('Erreur copie code:', err);
      }
    };

    container.addEventListener('click', handleCopyClick);
    return () => container.removeEventListener('click', handleCopyClick);
  }, [sanitizedHtml]);
  
  // ✅ Gérer les clics sur les boutons expand
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleExpandClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.toolbar-btn.expand-btn') as HTMLButtonElement;
      if (!button) return;

      e.preventDefault();
      e.stopPropagation();

      const codeBlock = button.closest('.u-block--code');
      const codeContent = codeBlock?.querySelector('pre code')?.textContent || '';
      const lang = (codeBlock as HTMLElement)?.dataset?.language || 'text';

      const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Code - ${lang.toUpperCase()}</title>
            <style>
              body { 
                font-family: 'JetBrains Mono', monospace; 
                background: #1a1a1a; 
                color: #a0a0a0; 
                margin: 0; 
                padding: 20px; 
                white-space: pre-wrap;
                font-size: 14px;
                line-height: 1.8;
              }
            </style>
          </head>
          <body>${codeContent}</body>
          </html>
        `);
        newWindow.document.close();
      }
    };

    container.addEventListener('click', handleExpandClick);
    return () => container.removeEventListener('click', handleExpandClick);
  }, [sanitizedHtml]);

  return (
    <div 
      ref={containerRef}
      key={`text-${index}`}
      className="chat-markdown"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
});

TextBlock.displayName = 'TextBlock';

// Composant principal pour le rendu des messages markdown avec support Mermaid
const EnhancedMarkdownMessage: React.FC<EnhancedMarkdownMessageProps> = ({ content }) => {
  // Détecter les blocs Mermaid dans le contenu
  const blocks = useMemo(() => {
    return detectMermaidBlocks(content);
  }, [content]);

  // Si aucun bloc Mermaid n'est détecté, utiliser le rendu markdown simple
  if (blocks.length === 0) {
    return <TextBlock content={content} index={0} />;
  }

  // Rendu avec blocs Mermaid
  return (
    <div className="enhanced-markdown-message">
      {blocks.map((block, index) => {
        if (block.type === 'mermaid') {
          // Valider la syntaxe Mermaid
          const isValid = validateMermaidSyntax(block.content);
          
          if (!isValid) {
            return (
              <div key={`mermaid-error-${index}`} className="mermaid-error-block">
                <div className="mermaid-error-header">
                  <span>❌ Syntaxe Mermaid invalide</span>
                </div>
                <pre className="mermaid-error-content">{block.content}</pre>
              </div>
            );
          }

          // Nettoyer le contenu Mermaid
          const cleanContent = cleanMermaidContent(block.content);
          
          return (
            <div key={`mermaid-wrapper-${index}`} className="chat-markdown">
              <MermaidRenderer
                key={`mermaid-${index}`}
                content={cleanContent}
                variant="chat"
                showToolbar={true}
                showCopy={true}
                showExpand={true}
                showEdit={false}
                renderOptions={{
                  timeout: 10000
                }}
              />
            </div>
          );
        } else {
          // Bloc de texte normal
          return (
            <TextBlock 
              key={`text-${index}`} 
              content={block.content} 
              index={index} 
            />
          );
        }
      })}
    </div>
  );
};

export default EnhancedMarkdownMessage; 