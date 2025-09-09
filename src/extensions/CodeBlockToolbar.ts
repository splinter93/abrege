import { Node } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';

// NOTE: La liste complète des langages n'est plus nécessaire ici car le sélecteur est supprimé.
// On garde une fonction pour formatter le label au cas où.
function formatLanguageLabel(language: string | null | undefined): string {
  if (!language || language === 'plaintext') return 'TEXT';
  return language.toUpperCase();
}

export function createCodeBlockToolbar(node: Node, getPos: () => number, editor: Editor) {
  const toolbar = document.createElement('div');
  toolbar.className = 'u-block__toolbar';

  // --- Conteneur gauche (Label du langage) ---
  const leftContainer = document.createElement('div');
  leftContainer.className = 'toolbar-left';
  
  const languageLabel = document.createElement('span');
  languageLabel.className = 'toolbar-label';
  languageLabel.textContent = formatLanguageLabel(node.attrs.language);
  leftContainer.appendChild(languageLabel);

  // --- Conteneur droite (boutons) ---
  const rightContainer = document.createElement('div');
  rightContainer.className = 'toolbar-right';
  const copyButton = createCopyButton(node);
  const expandButton = createExpandButton(node);
  rightContainer.appendChild(copyButton);
  rightContainer.appendChild(expandButton);

  // --- Assemblage ---
  toolbar.appendChild(leftContainer);
  toolbar.appendChild(rightContainer);

  return toolbar;
}

function createCopyButton(node: Node) {
    const copyButton = document.createElement('button');
    copyButton.className = 'toolbar-btn copy-btn';
    copyButton.title = 'Copier le code';
    
    const iconSVG = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    `;
    copyButton.innerHTML = iconSVG;

    let copyTimeout: NodeJS.Timeout | null = null;
  
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(node.textContent).then(() => {
        const copiedIconSVG = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        `;
        copyButton.innerHTML = copiedIconSVG;
        copyButton.classList.add('copied');
        
        if (copyTimeout) clearTimeout(copyTimeout);
        
        copyTimeout = setTimeout(() => {
          copyButton.innerHTML = iconSVG;
          copyButton.classList.remove('copied');
        }, 2000);
      });
    });

    return copyButton;
}

function createExpandButton(node: Node) {
    const expandButton = document.createElement('button');
    expandButton.className = 'toolbar-btn expand-btn';
    expandButton.title = 'Agrandir le code';
    
    const expandIconSVG = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    `;
    expandButton.innerHTML = expandIconSVG;

    expandButton.addEventListener('click', () => {
      // Ouvrir le code dans une modal ou un nouvel onglet
      const codeContent = node.textContent;
      const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Code - ${node.attrs.language || 'TEXT'}</title>
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

    return expandButton;
}
