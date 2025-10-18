'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import { detectMermaidBlocks, validateMermaidSyntax, cleanMermaidContent } from '@/components/chat/mermaidService';
import MermaidRenderer from '@/components/mermaid/MermaidRenderer';
import { formatPathsInElement } from '@/utils/formatPaths';
import MarkdownBlockRenderer from '@/components/MarkdownBlockRenderer';

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
    console.log('[PublicMarkdownRenderer] useEffect déclenché');
    
    if (!containerRef.current) {
      console.warn('[PublicMarkdownRenderer] containerRef.current est null');
      return;
    }

    console.log('[PublicMarkdownRenderer] containerRef OK, recherche des blocs...');

    // Transformer tous les blocs de code <pre><code> en structure avec toolbar unifiée
    const codeBlocks = containerRef.current.querySelectorAll('pre code');
    
    console.log(`[PublicMarkdownRenderer] ✅ Trouvé ${codeBlocks.length} bloc(s) de code à transformer`);
    
    if (codeBlocks.length === 0) {
      console.warn('[PublicMarkdownRenderer] Aucun bloc de code trouvé - le HTML est peut-être déjà transformé ou vide');
      console.log('[PublicMarkdownRenderer] HTML du container:', containerRef.current.innerHTML.substring(0, 500));
    }
    
    codeBlocks.forEach((codeElement, index) => {
      const preElement = codeElement.parentElement;
      if (!preElement) return;
      
      // ⚠️ GUARDS MULTIPLES - Éviter la double transformation
      // 1. Vérifier si déjà wrappé (le pre OU son parent est un u-block)
      if (preElement.classList.contains('u-block')) {
        console.log(`[PublicMarkdownRenderer] Bloc ${index} déjà wrappé (classList)`);
        return;
      }
      if (preElement.parentElement?.classList.contains('u-block')) {
        console.log(`[PublicMarkdownRenderer] Bloc ${index} déjà wrappé (parent)`);
        return;
      }
      if (preElement.closest('.u-block')) {
        console.log(`[PublicMarkdownRenderer] Bloc ${index} déjà wrappé (closest)`);
        return;
      }
      
      // 2. Vérifier si déjà transformé (attribut data-processed)
      if (preElement.hasAttribute('data-processed')) {
        console.log(`[PublicMarkdownRenderer] Bloc ${index} déjà transformé (data-processed)`);
        return;
      }
      
      // 3. Marquer comme transformé IMMÉDIATEMENT
      preElement.setAttribute('data-processed', 'true');
      console.log(`[PublicMarkdownRenderer] Transformation du bloc ${index}...`);

      // Créer la structure unifiée (identique à l'éditeur)
      const container = document.createElement('div');
      container.className = 'u-block u-block--code';
      container.setAttribute('data-processed', 'true'); // Marquer le container aussi
      
      // Créer la toolbar unifiée
      const toolbar = document.createElement('div');
      toolbar.className = 'u-block__toolbar';
      
      // Créer la structure toolbar-left/toolbar-right
      const toolbarLeft = document.createElement('div');
      toolbarLeft.className = 'toolbar-left';
      
      const toolbarRight = document.createElement('div');
      toolbarRight.className = 'toolbar-right';
      
      // Détecter le langage
      const language = codeElement.className.match(/language-(\w+)/)?.[1] || '';
      const languageDisplay = (language || 'Code').toUpperCase(); // Majuscule
      
      // Créer le label de langue
      const languageLabel = document.createElement('span');
      languageLabel.className = 'toolbar-label';
      languageLabel.textContent = languageDisplay;
      
      // Créer le bouton copy
      const copyBtn = document.createElement('button');
      copyBtn.className = 'toolbar-btn';
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      `;
      
      // Ajouter la fonctionnalité de copie
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeElement.textContent || '');
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          `;
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            `;
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Erreur lors de la copie:', err);
        }
      });
      
      // Créer le bouton agrandir
      const expandBtn = document.createElement('button');
      expandBtn.className = 'toolbar-btn expand-btn';
      expandBtn.title = 'Agrandir le code';
      expandBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      `;
      
      // Ajouter la fonctionnalité d'agrandissement
      expandBtn.addEventListener('click', () => {
        const codeContent = codeElement.textContent || '';
        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Code - ${languageDisplay}</title>
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
      });
      
      // Assembler la toolbar
      toolbarLeft.appendChild(languageLabel);
      toolbarRight.appendChild(copyBtn);
      toolbarRight.appendChild(expandBtn);
      toolbar.appendChild(toolbarLeft);
      toolbar.appendChild(toolbarRight);
      
      // Créer le body
      const body = document.createElement('div');
      body.className = 'u-block__body';
      
      // Créer le nouveau pre avec les bonnes classes
      const newPre = document.createElement('pre');
      newPre.appendChild(codeElement.cloneNode(true));
      
      // Assembler le container
      body.appendChild(newPre);
      container.appendChild(toolbar);
      container.appendChild(body);
      
      // Remplacer l'ancien pre par le nouveau container
      preElement.parentNode?.replaceChild(container, preElement);
    });

    // Formater les paths après le traitement des blocs de code
    formatPathsInElement(containerRef.current);
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
              <div key={`mermaid-error-${index}`} className="mermaid-container mermaid-editor mermaid-error">
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
              variant="editor"
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
          // Bloc de texte normal - utiliser le composant MarkdownBlockRenderer
          // qui va transformer les blocs de code avec toolbar
          const { html: blockHtml } = useMarkdownRender({ content: block.content });
          return (
            <MarkdownBlockRenderer
              key={`text-${index}`}
              html={blockHtml}
              className="markdown-body"
            />
          );
        }
      })}
    </div>
  );
};

export default PublicMarkdownRenderer;
