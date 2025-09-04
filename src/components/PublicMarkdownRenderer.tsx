'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from '@/components/chat/mermaidService';
import MermaidRenderer from '@/components/mermaid/MermaidRenderer';

interface PublicMarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Composant pour le rendu markdown avec support Mermaid sur les pages publiques
 * Utilise le même système de rendu que l'éditeur pour garantir la cohérence
 */
const PublicMarkdownRenderer: React.FC<PublicMarkdownRendererProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Utiliser le même hook de rendu markdown que l'éditeur
  const { html } = useMarkdownRender({ content });

  // Détecter les blocs Mermaid dans le contenu
  const blocks = useMemo(() => {
    return detectMermaidBlocks(content);
  }, [content]);

  // Post-traiter le HTML pour transformer les blocs de code en structure identique à l'éditeur
  useEffect(() => {
    if (!containerRef.current) return;

    // Transformer tous les blocs de code <pre><code> en structure avec toolbar
    const codeBlocks = containerRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((codeElement) => {
      const preElement = codeElement.parentElement;
      if (!preElement || preElement.classList.contains('code-block-container')) return;

      // Créer la structure de l'éditeur
      const container = document.createElement('div');
      container.className = 'code-block-container';
      
      // Créer la toolbar
      const toolbar = document.createElement('div');
      toolbar.className = 'unified-toolbar';
      
      // Détecter le langage
      const language = codeElement.className.match(/language-(\w+)/)?.[1] || '';
      const languageDisplay = language || 'Code';
      
      // Créer le label de langue
      const languageLabel = document.createElement('span');
      languageLabel.className = 'language-label';
      languageLabel.textContent = languageDisplay;
      languageLabel.style.cssText = `
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      `;
      
      // Créer le bouton copy
      const copyBtn = document.createElement('button');
      copyBtn.className = 'toolbar-btn copy-btn';
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;
      
      // Ajouter la fonctionnalité de copie
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeElement.textContent || '');
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
          `;
          copyBtn.style.color = 'var(--success)';
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            `;
            copyBtn.style.color = '';
          }, 2000);
        } catch (err) {
          console.error('Erreur lors de la copie:', err);
        }
      });
      
      // Assembler la toolbar
      toolbar.appendChild(languageLabel);
      toolbar.appendChild(copyBtn);
      
      // Créer le nouveau pre avec les bonnes classes
      const newPre = document.createElement('pre');
      newPre.className = 'hljs';
      newPre.appendChild(codeElement.cloneNode(true));
      
      // Assembler le container
      container.appendChild(toolbar);
      container.appendChild(newPre);
      
      // Remplacer l'ancien pre par le nouveau container
      preElement.parentNode?.replaceChild(container, preElement);
    });
  }, [html]);

  // Si aucun bloc Mermaid n'est détecté, utiliser le rendu markdown simple
  if (blocks.length === 0) {
    return (
      <div 
        ref={containerRef}
        className={`markdown-body ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Rendu avec blocs Mermaid
  return (
    <div className={`enhanced-markdown-message ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'mermaid') {
          // Valider la syntaxe Mermaid
          const isValid = validateMermaidSyntax(block.content);
          
          if (!isValid) {
            return (
              <div key={`mermaid-error-${index}`} className="mermaid-container mermaid-chat mermaid-error">
                <div className="mermaid-error-content">
                  <div className="mermaid-error-header">
                    <span>❌ Syntaxe Mermaid invalide</span>
                  </div>
                  <pre className="mermaid-error-message">{block.content}</pre>
                </div>
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
          // Bloc de texte normal - utiliser le rendu markdown pour ce bloc
          const { html: blockHtml } = useMarkdownRender({ content: block.content });
          return (
            <div 
              key={`text-${index}`}
              ref={index === 0 ? containerRef : undefined}
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: blockHtml }}
            />
          );
        }
      })}
    </div>
  );
};

export default PublicMarkdownRenderer;
