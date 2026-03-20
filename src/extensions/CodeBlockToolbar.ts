import { Node } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';

import { getCodeBlockLanguageLabel } from '@/utils/codeBlockLanguageLabels';

function formatLanguageLabel(language: string | null | undefined): string {
  return getCodeBlockLanguageLabel(language);
}

/**
 * @param getCodeText Texte réel du bloc : doit lire le DOM du contentDOM (pas node.textContent :
 * le nœud ProseMirror en fermeture est souvent vide / obsolète tant que le contenu n’est que dans l’éditeur).
 */
export function createCodeBlockToolbar(
  node: Node,
  getPos: () => number,
  editor: Editor,
  getCodeText: () => string
) {
  const toolbar = document.createElement('div');
  toolbar.className = 'u-block__toolbar';
  // Îlot hors édition : sinon ProseMirror (contenteditable) mange les clics sur les boutons
  toolbar.setAttribute('contenteditable', 'false');
  toolbar.setAttribute('spellcheck', 'false');

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
  const copyButton = createCopyButton(getCodeText);
  const expandButton = createExpandButton(getCodeText, node.attrs.language);
  rightContainer.appendChild(copyButton);
  rightContainer.appendChild(expandButton);

  // --- Assemblage ---
  toolbar.appendChild(leftContainer);
  toolbar.appendChild(rightContainer);

  return toolbar;
}

const DEFAULT_CODE_COPY_ICON_SVG = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    `;

function runCopyFeedback(copyButton: HTMLButtonElement, iconSVG: string, text: string): void {
  const copiedIconSVG = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    `;

  // Feedback immédiat — ne pas attendre la résolution du presse-papiers
  copyButton.innerHTML = copiedIconSVG;
  copyButton.classList.add('copied');
  copyButton.title = 'Copié !';

  const t = copyButton.dataset.copyResetTimeout;
  if (t) window.clearTimeout(Number(t));

  if (text) {
    void navigator.clipboard.writeText(text).catch(() => { /* silencieux */ });
  }

  const id = window.setTimeout(() => {
    copyButton.innerHTML = iconSVG;
    copyButton.classList.remove('copied');
    copyButton.title = 'Copier le code';
    delete copyButton.dataset.copyResetTimeout;
  }, 2000);
  copyButton.dataset.copyResetTimeout = String(id);
}

function createCopyButton(getCodeText: () => string) {
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'toolbar-btn copy-btn';
    copyButton.title = 'Copier le code';
    
    const iconSVG = DEFAULT_CODE_COPY_ICON_SVG;
    copyButton.innerHTML = iconSVG;

    // ProseMirror (contentDOM présent) peut appeler preventDefault() sur mousedown
    // ce qui bloque click. mouseup lui se déclenche toujours, y compris après preventDefault().
    // On utilise mouseup au lieu de click, exactement comme Mermaid utilise click
    // (Mermaid n'a pas de contentDOM donc PM ne preventDefault pas).
    copyButton.addEventListener('mousedown', (e) => {
      // Empêcher PM de déplacer le curseur dans le code quand on vise la toolbar
      e.preventDefault();
      e.stopPropagation();
    });

    copyButton.addEventListener('mouseup', (e) => {
      if ((e as MouseEvent).button !== 0) return;
      e.stopPropagation();
      const text = getCodeText();
      runCopyFeedback(copyButton, iconSVG, text);
    });

    return copyButton;
}

function createExpandButton(getCodeText: () => string, language: string | null) {
    const expandButton = document.createElement('button');
    expandButton.type = 'button';
    expandButton.className = 'toolbar-btn expand-btn';
    expandButton.title = 'Agrandir le code';
    
    const expandIconSVG = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    `;
    expandButton.innerHTML = expandIconSVG;

    expandButton.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    expandButton.addEventListener('mouseup', (e) => {
      if ((e as MouseEvent).button !== 0) return;
      e.stopPropagation();
      const codeContent = getCodeText();
      const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Code - ${(language || 'text').toUpperCase()}</title>
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
