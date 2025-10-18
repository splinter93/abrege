/**
 * Composant pour rendre un bloc de markdown individuel
 * avec transformation des blocs de code en structure unifiée
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { formatPathsInElement } from '@/utils/formatPaths';

interface MarkdownBlockRendererProps {
  html: string;
  className?: string;
}

export const MarkdownBlockRenderer: React.FC<MarkdownBlockRendererProps> = ({ 
  html, 
  className = 'markdown-body' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Transformer tous les blocs de code <pre><code> en structure avec toolbar unifiée
    const codeBlocks = containerRef.current.querySelectorAll('pre code');
    
    console.log(`[MarkdownBlockRenderer] Transformation de ${codeBlocks.length} bloc(s) de code`);
    
    codeBlocks.forEach((codeElement, index) => {
      const preElement = codeElement.parentElement;
      if (!preElement) return;
      
      // Vérifier si déjà transformé
      if (preElement.closest('.u-block') || preElement.hasAttribute('data-processed')) {
        console.log(`[MarkdownBlockRenderer] Bloc ${index} déjà transformé, skip`);
        return;
      }
      
      preElement.setAttribute('data-processed', 'true');
      console.log(`[MarkdownBlockRenderer] ✅ Transformation du bloc ${index}`);

      // Créer la structure unifiée
      const container = document.createElement('div');
      container.className = 'u-block u-block--code';
      container.setAttribute('data-processed', 'true');
      
      // Créer la toolbar
      const toolbar = document.createElement('div');
      toolbar.className = 'u-block__toolbar';
      
      const toolbarLeft = document.createElement('div');
      toolbarLeft.className = 'toolbar-left';
      
      const toolbarRight = document.createElement('div');
      toolbarRight.className = 'toolbar-right';
      
      // Détecter le langage
      const language = codeElement.className.match(/language-(\w+)/)?.[1] || '';
      const languageDisplay = (language || 'Code').toUpperCase(); // Majuscule
      
      // Label de langue
      const languageLabel = document.createElement('span');
      languageLabel.className = 'toolbar-label';
      languageLabel.textContent = languageDisplay;
      
      // Bouton copier
      const copyBtn = document.createElement('button');
      copyBtn.className = 'toolbar-btn';
      copyBtn.title = 'Copier le code';
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      `;
      
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeElement.textContent || '');
          copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12" /></svg>`;
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>`;
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Erreur copie:', err);
        }
      });
      
      // Bouton agrandir
      const expandBtn = document.createElement('button');
      expandBtn.className = 'toolbar-btn expand-btn';
      expandBtn.title = 'Agrandir le code';
      expandBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      `;
      
      expandBtn.addEventListener('click', () => {
        const codeContent = codeElement.textContent || '';
        const newWindow = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Code - ${languageDisplay}</title>
              <style>
                body { 
                  font-family: 'JetBrains Mono', 'Courier New', monospace; 
                  background: #1a1a1a; 
                  color: #d0d0d0; 
                  margin: 0; 
                  padding: 30px; 
                  white-space: pre-wrap;
                  font-size: 14px;
                  line-height: 1.6;
                  tab-size: 2;
                }
                pre {
                  margin: 0;
                  font-family: inherit;
                }
              </style>
            </head>
            <body><pre>${codeContent}</pre></body>
            </html>
          `);
          newWindow.document.close();
        }
      });
      
      // Assembler la toolbar
      toolbarLeft.appendChild(languageLabel);
      toolbarRight.appendChild(copyBtn);
      toolbarRight.appendChild(expandBtn); // Ajouter le bouton agrandir
      toolbar.appendChild(toolbarLeft);
      toolbar.appendChild(toolbarRight);
      
      // Créer le body
      const body = document.createElement('div');
      body.className = 'u-block__body';
      
      const newPre = document.createElement('pre');
      newPre.appendChild(codeElement.cloneNode(true));
      
      // Assembler
      body.appendChild(newPre);
      container.appendChild(toolbar);
      container.appendChild(body);
      
      // Remplacer
      preElement.parentNode?.replaceChild(container, preElement);
    });

    // Formater les paths
    formatPathsInElement(containerRef.current);
  }, [html]);

  return (
    <div 
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownBlockRenderer;

