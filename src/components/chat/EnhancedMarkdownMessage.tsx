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
  
  // ✅ SÉCURITÉ: Fonction sécurisée pour remplacer les blocs de code ET wrapper les tableaux
  const processCodeBlocks = (htmlContent: string) => {
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
          'input', 'label' // ✅ Support des checkboxes
        ],
        ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'title', 'style', 'colspan', 'rowspan', 'scope', 'headers', 'type', 'checked', 'disabled'],
        ALLOW_DATA_ATTR: true // ✅ CRITIQUE: Autoriser data-* sinon les wrappers perdent leurs attributs !
      });
      
      // Créer un DOM parser temporaire avec contenu sanitizé
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedContent, 'text/html');
      
      // ✅ NOUVEAU: Wrapper les tableaux pour le scroll horizontal
      const tables = doc.querySelectorAll('table');
      tables.forEach((table) => {
        // Créer un wrapper avec overflow
        const wrapper = doc.createElement('div');
        wrapper.className = 'table-wrapper-chat';
        
        // Wrapper le tableau
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });
      
      // Trouver tous les blocs pre > code
      const codeBlocks = doc.querySelectorAll('pre > code');
      
      codeBlocks.forEach((codeElement, blockIndex) => {
        const preElement = codeElement.parentElement;
        if (!preElement) return;
        
        // ✅ SÉCURITÉ: Échapper le contenu avant de l'utiliser
        const language = (codeElement.className.replace('language-', '') || '').replace(/[^a-zA-Z0-9-_]/g, '');
        const codeContent = (codeElement.textContent || '').replace(/[<>]/g, (match) => 
          match === '<' ? '&lt;' : '&gt;'
        );
        
        // ✅ FIX RADICAL: Créer directement la structure u-block complète (pas de wrapper intermédiaire)
        const blockContainer = doc.createElement('div');
        blockContainer.className = 'u-block u-block--code';
        
        // Toolbar
        const toolbar = doc.createElement('div');
        toolbar.className = 'u-block__toolbar';
        toolbar.innerHTML = `
          <div class="toolbar-left">
            <span class="toolbar-label">${(language || 'CODE').toUpperCase()}</span>
          </div>
          <div class="toolbar-right">
            <button class="toolbar-btn copy-btn" title="Copier le code" data-content="${codeContent.replace(/"/g, '&quot;')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        `;
        
        // Body
        const body = doc.createElement('div');
        body.className = 'u-block__body';
        const pre = doc.createElement('pre');
        const code = doc.createElement('code');
        code.className = `language-${language}`;
        code.textContent = codeElement.textContent || '';
        pre.appendChild(code);
        body.appendChild(pre);
        
        // Assembler
        blockContainer.appendChild(toolbar);
        blockContainer.appendChild(body);
        
        // Remplacer le pre par notre u-block complet
        preElement.parentNode?.replaceChild(blockContainer, preElement);
      });
      
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
          'input', 'label' // ✅ Support des checkboxes
        ],
        ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'title', 'style', 'colspan', 'rowspan', 'scope', 'headers', 'type', 'checked', 'disabled'],
        ALLOW_DATA_ATTR: false
      });
    }
  };
  
  // ✅ SÉCURITÉ: Sanitizer le HTML avant de l'injecter (avec support des tableaux wrappés + checkboxes)
  const processedHtml = processCodeBlocks(html);
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
      'input', 'label' // ✅ Support des checkboxes
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'data-language', 'data-content', 'data-index',
      'colspan', 'rowspan', 'scope', 'headers',
      'width', 'height', 'align', 'valign',
      'type', 'checked', 'disabled' // ✅ Attributs des checkboxes
    ],
    ALLOW_DATA_ATTR: true,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // ✅ Permettre les wrappers de tableaux
    ADD_TAGS: ['div'],
    ADD_ATTR: ['class']
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
      const button = target.closest('.copy-btn') as HTMLButtonElement;
      if (!button) return;

      const content = button.getAttribute('data-content');
      if (!content) return;

      try {
        await navigator.clipboard.writeText(content);
        button.classList.add('copied');
        setTimeout(() => button.classList.remove('copied'), 2000);
      } catch (err) {
        logger.error('Erreur copie code:', err);
      }
    };

    container.addEventListener('click', handleCopyClick);
    return () => container.removeEventListener('click', handleCopyClick);
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