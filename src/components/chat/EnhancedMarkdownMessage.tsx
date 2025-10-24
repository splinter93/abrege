"use client";
import React, { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import DOMPurify from 'dompurify';
import { useMarkdownRender } from '../../hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
import MermaidRenderer from '@/components/mermaid/MermaidRenderer';
import { createRoot, Root } from 'react-dom/client';
import { simpleLogger as logger } from '@/utils/logger';
import { openImageModal } from './ImageModal';
import '@/styles/mermaid.css';
import '@/styles/unified-blocks.css';

interface EnhancedMarkdownMessageProps {
  content: string;
}

// Hook personnalisé pour gérer les racines React de manière sécurisée
const useSafeReactRoots = () => {
  const rootsRef = useRef<Map<HTMLElement, Root>>(new Map());
  const isUnmountingRef = useRef(false);

  const createSafeRoot = useCallback((element: HTMLElement): Root | null => {
    if (isUnmountingRef.current || !element.isConnected) {
      return null;
    }

    try {
      const root = createRoot(element);
      rootsRef.current.set(element, root);
      return root;
    } catch (error) {
      logger.warn('Error creating React root:', error);
      return null;
    }
  }, []);

  const renderSafeRoot = useCallback((root: Root | null, element: React.ReactElement) => {
    if (!root || isUnmountingRef.current) return false;

    try {
      root.render(element);
      return true;
    } catch (error) {
      logger.warn('Error rendering to React root:', error);
      return false;
    }
  }, []);

  const unmountAllRoots = useCallback(() => {
    isUnmountingRef.current = true;
    
    // Utiliser requestAnimationFrame pour démonter après le cycle de rendu actuel
    requestAnimationFrame(() => {
      rootsRef.current.forEach((root, element) => {
        try {
          // Vérifier si l'élément existe encore dans le DOM
          if (element.isConnected && root) {
            root.unmount();
          }
        } catch (error) {
          // Ignorer silencieusement les erreurs de démontage pendant le rendu
          if (process.env.NODE_ENV === 'development') {
            logger.warn('Error unmounting root:', error);
          }
        }
      });
      rootsRef.current.clear();
      isUnmountingRef.current = false;
    });
  }, []);

  return {
    createSafeRoot,
    renderSafeRoot,
    unmountAllRoots,
    isUnmounting: isUnmountingRef.current
  };
};

// Composant pour remplacer les wrappers de code blocks par CodeBlock React
const CodeBlockReplacer: React.FC<{ containerRef: React.RefObject<HTMLDivElement | null> }> = React.memo(({ containerRef }) => {
  const { createSafeRoot, renderSafeRoot, unmountAllRoots } = useSafeReactRoots();

  useEffect(() => {
    if (!containerRef.current) return;

    // Utiliser un timeout pour s'assurer que le HTML est injecté
    const timeoutId = setTimeout(() => {
      // Trouver tous les wrappers de code blocks
      const codeBlockWrappers = containerRef.current?.querySelectorAll('.code-block-wrapper');
      
      if (!codeBlockWrappers) return;
      
      codeBlockWrappers.forEach((wrapper, index) => {
        // Vérifier si ce wrapper a déjà été traité
        if (wrapper.hasAttribute('data-processed')) return;
        
        const language = wrapper.getAttribute('data-language') || '';
        const content = wrapper.getAttribute('data-content') || '';
        
        // Marquer comme traité
        wrapper.setAttribute('data-processed', 'true');
        
        // Créer une racine React sécurisée pour ce wrapper
        const root = createSafeRoot(wrapper as HTMLElement);
        
        if (root) {
          // Rendre un code block avec toolbar (comme dans l'éditeur)
          renderSafeRoot(root, 
            <div className="u-block u-block--code">
              <div className="u-block__toolbar">
                <div className="toolbar-left">
                  <span className="toolbar-label">{language.toUpperCase() || 'CODE'}</span>
                </div>
                <div className="toolbar-right">
                  <button 
                    className="toolbar-btn copy-btn" 
                    title="Copier le code"
                    onClick={async (e) => {
                      try {
                        await navigator.clipboard.writeText(content);
                        const btn = e.currentTarget;
                        btn.classList.add('copied');
                        setTimeout(() => btn.classList.remove('copied'), 2000);
                      } catch (err) {
                        logger.error('Erreur copie code:', err);
                      }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="u-block__body">
                <pre>
                  <code className={`language-${language}`}>
                    {content}
                  </code>
                </pre>
              </div>
            </div>
          );
        }
      });
    }, 0);

    // Cleanup function - démontage sécurisé
    return () => {
      clearTimeout(timeoutId);
      unmountAllRoots();
    };
  }, [containerRef, createSafeRoot, renderSafeRoot, unmountAllRoots]);

  return null;
});

CodeBlockReplacer.displayName = 'CodeBlockReplacer';

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
      // ✅ SÉCURITÉ: Sanitizer d'abord le contenu avant parsing (avec support des tableaux)
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
          'hr', 'br'
        ],
        ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'title', 'style', 'colspan', 'rowspan', 'scope', 'headers'],
        ALLOW_DATA_ATTR: false // Désactiver les data-* pour plus de sécurité
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
        
        // Créer un wrapper sécurisé
        const wrapper = doc.createElement('div');
        wrapper.className = 'code-block-wrapper';
        wrapper.setAttribute('data-language', language);
        wrapper.setAttribute('data-content', codeContent);
        wrapper.setAttribute('data-index', blockIndex.toString());
        
        // Remplacer le pre par notre wrapper
        preElement.parentNode?.replaceChild(wrapper, preElement);
      });
      
      return doc.body.innerHTML;
    } catch (error) {
      logger.error('Erreur lors du traitement des code blocks:', error);
      // ✅ SÉCURITÉ: Fallback sécurisé en cas d'erreur (avec support des tableaux)
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
          'hr', 'br'
        ],
        ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'title', 'style', 'colspan', 'rowspan', 'scope', 'headers'],
        ALLOW_DATA_ATTR: false
      });
    }
  };
  
  // ✅ SÉCURITÉ: Sanitizer le HTML avant de l'injecter (avec support des tableaux wrappés)
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
      'hr', 'br'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'data-language', 'data-content', 'data-index',
      'colspan', 'rowspan', 'scope', 'headers',
      'width', 'height', 'align', 'valign'
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
  
  return (
    <>
      <div 
        ref={containerRef}
        key={`text-${index}`}
        className="chat-markdown"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
      <CodeBlockReplacer containerRef={containerRef} />
    </>
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