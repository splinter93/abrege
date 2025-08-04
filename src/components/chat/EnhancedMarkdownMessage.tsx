"use client";
import React, { useMemo } from 'react';
import { useMarkdownRender } from '../../hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
import MermaidRenderer from './MermaidRenderer';
import './index.css';

interface EnhancedMarkdownMessageProps {
  content: string;
}

const EnhancedMarkdownMessage: React.FC<EnhancedMarkdownMessageProps> = ({ content }) => {
  // Détecter les blocs Mermaid
  const blocks = useMemo(() => detectMermaidBlocks(content), [content]);

  // Always call useMarkdownRender at the top level to maintain hook order
  const { html: fullHtml } = useMarkdownRender({ content, debounceDelay: 0, disableDebounce: true });

  // Pré-rendre tous les blocs de texte pour éviter les hooks conditionnels
  const renderedBlocks = useMemo(() => {
    return blocks.map((block, index) => {
      if (block.type === 'text') {
        // Pour les blocs de texte, utiliser le HTML complet
        return {
          type: 'text' as const,
          content: fullHtml,
          index
        };
      } else {
        // Pour les blocs Mermaid, préparer les données
        const mermaidContent = cleanMermaidContent(block.content);
        const validation = validateMermaidSyntax(mermaidContent);
        
        return {
          type: 'mermaid' as const,
          content: mermaidContent,
          validation,
          originalContent: block.content,
          startIndex: block.startIndex,
          index
        };
      }
    });
  }, [blocks, fullHtml]);

  // Si aucun bloc Mermaid, utiliser le rendu markdown normal
  if (blocks.length === 1 && blocks[0].type === 'text') {
    return (
      <div 
        className="chat-markdown"
        dangerouslySetInnerHTML={{ __html: fullHtml }}
      />
    );
  }

  // Rendu mixte : texte + Mermaid
  return (
            <div className="chat-enhanced-markdown">
      {renderedBlocks.map((block) => {
        if (block.type === 'text') {
          return (
            <div 
              key={`text-${block.index}`}
              className="chat-markdown"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          );
        } else {
          // Rendu Mermaid pour les diagrammes
          return (
            <div key={`mermaid-${block.index}-${block.startIndex}`} className="mermaid-block">
              {block.validation.isValid ? (
                <MermaidRenderer 
                  key={`mermaid-renderer-${block.index}-${block.startIndex}`}
                  chart={block.content}
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
                    {block.validation.error && (
                      <details>
                        <summary>Erreur</summary>
                        <pre>{block.validation.error}</pre>
                      </details>
                    )}
                    <details>
                      <summary>Code source</summary>
                      <pre className="mermaid-source">{block.originalContent}</pre>
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
};

export default EnhancedMarkdownMessage; 