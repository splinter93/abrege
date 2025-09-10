"use client";
import React, { useMemo, useEffect, useRef } from 'react';
import { useMarkdownRender } from '../../hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
import MermaidRenderer from '@/components/mermaid/MermaidRenderer';
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