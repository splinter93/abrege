'use client';
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, ContentBlock } from './mermaidService';

interface EnhancedMarkdownMessageProps {
  content: string;
}

// Fonction utilitaire pour vérifier si on est côté client
const isClient = typeof window !== 'undefined';

// Fonction pour remplacer les blocs de code par des wrappers (côté client uniquement)
const processCodeBlocks = (htmlContent: string) => {
  if (!isClient) return htmlContent;
  
  try {
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
  } catch (error) {
    console.warn('Erreur lors du traitement des blocs de code:', error);
    return htmlContent;
  }
};

const TextBlock: React.FC<{ content: string; index: number }> = React.memo(({ content, index }) => {
  const { html } = useMarkdownRender({ content });
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  const [isMounted, setIsMounted] = useState(false);
  
  // Vérifier que le composant est monté côté client
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const { html: fullHtml } = useMarkdownRender({ content });
  const blocks = useMemo(() => detectMermaidBlocks(content), [content]);

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

    // Si on a des blocs Mermaid, les traiter un par un
    return blocks.map((block, index) => {
      if (block.type === 'mermaid') {
        return (
          <div key={`mermaid-${index}`} className="mermaid-block">
            <pre className="mermaid">
              {block.content}
            </pre>
          </div>
        );
      } else {
        return (
          <TextBlock 
            key={`text-${index}`} 
            content={block.content} 
            index={index} 
          />
        );
      }
    });
  }, [blocks, fullHtml]);

  // Ne pas rendre le contenu tant qu'on n'est pas côté client
  if (!isMounted) {
    return (
      <div className="chat-markdown">
        <div className="loading-placeholder">
          <div className="animate-pulse bg-gray-200 h-4 rounded mb-2"></div>
          <div className="animate-pulse bg-gray-200 h-3 rounded mb-2"></div>
          <div className="animate-pulse bg-gray-200 h-3 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-markdown-message">
      {renderedContent}
    </div>
  );
});

EnhancedMarkdownMessage.displayName = 'EnhancedMarkdownMessage';

export default EnhancedMarkdownMessage; 