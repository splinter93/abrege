"use client";
import React, { useMemo } from 'react';
import { useMarkdownRender } from '../../hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
import MermaidRenderer from './MermaidRenderer';
import './index.css';

interface EnhancedMarkdownMessageProps {
  content: string;
}

// Composant séparé pour les blocs de texte
const TextBlock: React.FC<{ content: string; index: number }> = React.memo(({ content, index }) => {
  const { html } = useMarkdownRender({ content });
  
  return (
    <div 
      key={`text-${index}`}
      className="chat-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

TextBlock.displayName = 'TextBlock';

const EnhancedMarkdownMessage: React.FC<EnhancedMarkdownMessageProps> = React.memo(({ content }) => {
  // ==================================================================
  // 1. Appeler TOUS les hooks inconditionnellement en premier
  // ==================================================================
  
  const { html: fullHtml } = useMarkdownRender({ content });

  const blocks = useMemo(() => detectMermaidBlocks(content), [content]);

  // Mémoriser le rendu pour éviter les re-renders inutiles
  const renderedContent = useMemo(() => {
    // Si pas de blocs Mermaid, rendu simple
    if (blocks.length === 1 && blocks[0].type === 'text') {
      return (
        <div 
          className="chat-markdown"
          dangerouslySetInnerHTML={{ __html: fullHtml }}
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

  return renderedContent;
});

EnhancedMarkdownMessage.displayName = 'EnhancedMarkdownMessage';

export default EnhancedMarkdownMessage; 