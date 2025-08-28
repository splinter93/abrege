"use client";
import React, { useMemo, useEffect, useRef } from 'react';
import { useMarkdownRender } from '../../hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
import MermaidRenderer from './MermaidRenderer';
import CodeBlock from './CodeBlock';
import { createRoot } from 'react-dom/client';
import './index.css';

interface EnhancedMarkdownMessageProps {
  content: string;
}

// Composant pour remplacer les wrappers de code blocks par CodeBlock React
const CodeBlockReplacer: React.FC<{ containerRef: React.RefObject<HTMLDivElement | null> }> = React.memo(({ containerRef }) => {
  useEffect(() => {
    if (!containerRef.current) return;

    // Trouver tous les wrappers de code blocks
    const codeBlockWrappers = containerRef.current.querySelectorAll('.code-block-wrapper');
    
    codeBlockWrappers.forEach((wrapper, index) => {
      // Vérifier si ce wrapper a déjà été traité
      if (wrapper.hasAttribute('data-processed')) return;
      
      const language = wrapper.getAttribute('data-language') || '';
      const content = wrapper.getAttribute('data-content') || '';
      
      // Marquer comme traité
      wrapper.setAttribute('data-processed', 'true');
      
      // Créer une racine React pour ce wrapper
      const root = createRoot(wrapper as HTMLElement);
      
      // Rendre le composant CodeBlock
      root.render(
        <CodeBlock language={language}>
          {content}
        </CodeBlock>
      );
    });
  }, [containerRef]);

  return null;
});

CodeBlockReplacer.displayName = 'CodeBlockReplacer';

// Composant séparé pour les blocs de texte avec support des code blocks
const TextBlock: React.FC<{ content: string; index: number }> = React.memo(({ content, index }) => {
  const { html } = useMarkdownRender({ content });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fonction pour remplacer les blocs de code par des wrappers
  const processCodeBlocks = (htmlContent: string) => {
    // Vérifier si nous sommes côté client (DOMParser n'est disponible que dans le navigateur)
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return htmlContent; // Retourner le HTML original côté serveur
    }
    
    // Créer un DOM parser temporaire
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Trouver tous les blocs pre > code
    const codeBlocks = doc.querySelectorAll('pre > code');
    
    codeBlocks.forEach((codeElement, blockIndex) => {
      const preElement = codeElement.parentElement;
      if (!preElement) return;
      
      // Extraire le langage et le contenu
      const language = codeElement.className.replace('language-', '') || '';
      const codeContent = codeElement.textContent || '';
      
      // Créer un wrapper pour notre composant React
      const wrapper = doc.createElement('div');
      wrapper.className = 'code-block-wrapper';
      wrapper.setAttribute('data-language', language);
      wrapper.setAttribute('data-content', codeContent);
      wrapper.setAttribute('data-index', blockIndex.toString());
      
      // Remplacer le pre par notre wrapper
      preElement.parentNode?.replaceChild(wrapper, preElement);
    });
    
    return doc.body.innerHTML;
  };
  
  // Traiter le HTML pour remplacer les code blocks
  const processedHtml = processCodeBlocks(html);
  
  return (
    <div 
      ref={containerRef}
      key={`text-${index}`}
      className="chat-markdown"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
});

TextBlock.displayName = 'TextBlock';

const EnhancedMarkdownMessage: React.FC<EnhancedMarkdownMessageProps> = React.memo(({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ==================================================================
  // 1. Appeler TOUS les hooks inconditionnellement en premier
  // ==================================================================
  
  const { html: fullHtml } = useMarkdownRender({ content });

  const blocks = useMemo(() => detectMermaidBlocks(content), [content]);

  // Fonction pour remplacer les blocs de code par des wrappers
  const processCodeBlocks = (htmlContent: string) => {
    // Vérifier si nous sommes côté client (DOMParser n'est disponible que dans le navigateur)
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return htmlContent; // Retourner le HTML original côté serveur
    }
    
    // Créer un DOM parser temporaire
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Trouver tous les blocs pre > code
    const codeBlocks = doc.querySelectorAll('pre > code');
    
    codeBlocks.forEach((codeElement, blockIndex) => {
      const preElement = codeElement.parentElement;
      if (!preElement) return;
      
      // Extraire le langage et le contenu
      const language = codeElement.className.replace('language-', '') || '';
      const codeContent = codeElement.textContent || '';
      
      // Créer un wrapper pour notre composant React
      const wrapper = doc.createElement('div');
      wrapper.className = 'code-block-wrapper';
      wrapper.setAttribute('data-language', language);
      wrapper.setAttribute('data-content', codeContent);
      wrapper.setAttribute('data-index', blockIndex.toString());
      
      // Remplacer le pre par notre wrapper
      preElement.parentNode?.replaceChild(wrapper, preElement);
    });
    
    return doc.body.innerHTML;
  };

  // Mémoriser le rendu pour éviter les re-renders inutiles
  const renderedContent = useMemo(() => {
    // Si pas de blocs Mermaid, rendu simple avec traitement des code blocks
    if (blocks.length === 1 && blocks[0].type === 'text') {
      const processedHtml = processCodeBlocks(fullHtml);
      return (
        <div 
          ref={containerRef}
          className="chat-markdown"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      );
    }

    // Si on a des blocs Mermaid, on doit traiter chaque bloc séparément
    return (
      <div className="chat-enhanced-markdown">
        {blocks.map((block, index) => {
          if (block.type === 'text') {
            // Pour les blocs de texte, utiliser le composant séparé
            return <TextBlock key={`text-${index}`} content={block.content} index={index} />;
          } else {
            // Pour les blocs Mermaid
            const mermaidContent = cleanMermaidContent(block.content);
            const validation = validateMermaidSyntax(mermaidContent);
            
            return (
              <div key={`mermaid-${index}`} className="mermaid-block">
                {validation.isValid ? (
                  <MermaidRenderer 
                    key={`mermaid-renderer-${index}`}
                    chart={mermaidContent}
                    className="mermaid-inline"
                  />
                ) : (
                  <div className="mermaid-invalid">
                    <div className="mermaid-invalid-content">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      <span>Diagramme Mermaid invalide</span>
                      {validation.error && (
                        <details>
                          <summary>Erreur</summary>
                          <pre>{validation.error}</pre>
                        </details>
                      )}
                      <details>
                        <summary>Code source</summary>
                        <pre className="mermaid-source">{block.content}</pre>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            );
          }
        })}
      </div>
    );
  }, [blocks, fullHtml]);

  return (
    <div ref={containerRef}>
      {renderedContent}
      <CodeBlockReplacer containerRef={containerRef} />
    </div>
  );
});

EnhancedMarkdownMessage.displayName = 'EnhancedMarkdownMessage';

export default EnhancedMarkdownMessage; 