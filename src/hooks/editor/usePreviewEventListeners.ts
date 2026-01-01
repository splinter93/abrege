/**
 * usePreviewEventListeners - Hook pour les event listeners en mode preview
 * 
 * Responsabilités:
 * - Copy buttons (code blocks + mermaid)
 * - Expand buttons (code blocks + mermaid)
 */

import { useCallback } from 'react';
import { openMermaidModal } from '@/components/mermaid/MermaidModal';

interface UsePreviewEventListenersOptions {
  container: HTMLElement | null;
}

/**
 * Hook pour attacher les event listeners en mode preview
 */
export function usePreviewEventListeners({ container }: UsePreviewEventListenersOptions) {
  const setupEventListeners = useCallback(() => {
    if (!container) return;
    
    // Copier le code (code blocks + mermaid)
    const copyButtons = container.querySelectorAll('.copy-btn');
    copyButtons.forEach(btn => {
      const button = btn as HTMLButtonElement;
      const codeBlock = button.closest('.u-block');
      const codeContent = codeBlock?.querySelector('pre code')?.textContent || '';
      
      const handleCopy = () => {
        navigator.clipboard.writeText(codeContent).then(() => {
          button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          `;
          button.classList.add('copied');
          
          setTimeout(() => {
            button.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            `;
            button.classList.remove('copied');
          }, 2000);
        });
      };
      
      button.addEventListener('click', handleCopy);
    });
    
    // Agrandir (code blocks)
    const expandButtons = container.querySelectorAll('.u-block--code .expand-btn');
    expandButtons.forEach(btn => {
      const button = btn as HTMLButtonElement;
      const codeBlock = button.closest('.u-block');
      const codeContent = codeBlock?.querySelector('pre code')?.textContent || '';
      const lang = (codeBlock as HTMLElement)?.dataset?.language || 'text';
      
      const handleExpand = () => {
        const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Code - ${lang.toUpperCase()}</title>
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
      };
      
      button.addEventListener('click', handleExpand);
    });
    
    // Agrandir (mermaid)
    const mermaidExpandButtons = container.querySelectorAll('.u-block--mermaid .expand-btn');
    mermaidExpandButtons.forEach(btn => {
      const button = btn as HTMLButtonElement;
      const codeBlock = button.closest('.u-block');
      const mermaidContent = (codeBlock?.querySelector('.u-block__body') as HTMLElement)?.dataset?.mermaidContent || '';
      
      const handleExpand = () => {
        if (mermaidContent) {
          openMermaidModal(mermaidContent);
        }
      };
      
      button.addEventListener('click', handleExpand);
    });
  }, [container]);

  return {
    setupEventListeners
  };
}

