"use client";
import React, { useMemo } from 'react';
import { useMarkdownRender } from '../../hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from './mermaidService';
import MermaidRenderer from './MermaidRenderer';
import './chatMarkdown.css';

interface EnhancedMarkdownMessageProps {
  content: string;
}

const EnhancedMarkdownMessage: React.FC<EnhancedMarkdownMessageProps> = ({ content }) => {
  // Détecter les blocs Mermaid
  const blocks = useMemo(() => detectMermaidBlocks(content), [content]);

  // Always call useMarkdownRender at the top level to maintain hook order
  const { html: fullHtml } = useMarkdownRender({ content, debounceDelay: 0 });

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
    <div className="enhanced-markdown">
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          // Use the full HTML for text blocks in mixed content
          const { html } = useMarkdownRender({ content: block.content, debounceDelay: 0 });
          return (
            <div 
              key={`text-${index}`}
              className="chat-markdown"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } else {
          // Rendu Mermaid pour les diagrammes
          const mermaidContent = cleanMermaidContent(block.content);
          const validation = validateMermaidSyntax(mermaidContent);
          
          return (
            <div key={`mermaid-${index}-${block.startIndex}`} className="mermaid-block">
              {validation.isValid ? (
                <MermaidRenderer 
                  key={`mermaid-renderer-${index}-${block.startIndex}`}
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
};

export default EnhancedMarkdownMessage; 