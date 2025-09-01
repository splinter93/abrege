/**
 * Extension Tiptap pour les blocs Mermaid
 * Utilise la configuration centralisée avec rendu DOM direct
 */

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Node } from '@tiptap/pm/model';
import { openMermaidModal } from '@/components/mermaid/MermaidModal';
import { normalizeMermaidContent } from '@/components/chat/mermaidService';
import { initializeMermaid } from '@/services/mermaid/mermaidConfig';
import { simpleLogger as logger } from '@/utils/logger';

const MermaidTiptapExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node }) => {
      const codeContent = node.textContent;
      const language = node.attrs.language || '';

      // Détecter si c'est un bloc Mermaid
      const isMermaid = language === 'mermaid' || 
                       (language === '' && codeContent.trim().startsWith('flowchart')) ||
                       (language === '' && codeContent.trim().startsWith('sequenceDiagram')) ||
                       (language === '' && codeContent.trim().startsWith('classDiagram')) ||
                       (language === '' && codeContent.trim().startsWith('pie')) ||
                       (language === '' && codeContent.trim().startsWith('gantt')) ||
                       (language === '' && codeContent.trim().startsWith('gitGraph')) ||
                       (language === '' && codeContent.trim().startsWith('journey')) ||
                       (language === '' && codeContent.trim().startsWith('er')) ||
                       (language === '' && codeContent.trim().startsWith('stateDiagram'));

      if (isMermaid) {
        // Rendre le diagramme Mermaid avec DOM direct
        return renderMermaidBlock(codeContent);
      } else {
        // Rendre le bloc de code normal avec bouton de copie
        return renderCodeBlock(node, language);
      }
    };
  },
});

// Fonction pour rendre un bloc Mermaid
function renderMermaidBlock(mermaidContent: string) {
  const container = document.createElement('div');
  container.className = 'mermaid-container mermaid-editor mermaid-loading';
  container.style.position = 'relative';
  
  // Créer la barre d'outils avec boutons
  const toolbar = document.createElement('div');
  toolbar.className = 'mermaid-actions';
  toolbar.style.position = 'absolute';
  toolbar.style.top = '8px';
  toolbar.style.right = '8px';
  toolbar.style.zIndex = '10';
  
  // Bouton Copier
  const copyButton = document.createElement('button');
  copyButton.className = 'mermaid-action-btn mermaid-copy-btn';
  copyButton.title = 'Copier le code Mermaid';
  copyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
    <span>Copier</span>
  `;
  
  const copyCheckIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>Copié !</span>
  `;
  
  let copyTimeout: NodeJS.Timeout | null = null;
  
  const handleCopyClick = () => {
    navigator.clipboard.writeText(mermaidContent).then(() => {
      copyButton.innerHTML = copyCheckIcon;
      copyButton.style.color = '#f97316';
      
      // Nettoyer le timeout précédent
      if (copyTimeout) {
        clearTimeout(copyTimeout);
      }
      
      copyTimeout = setTimeout(() => {
        copyButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copier</span>
        `;
        copyButton.style.color = '';
      }, 2000);
    });
  };
  
  copyButton.addEventListener('click', handleCopyClick);
  
  // Bouton Agrandir
  const expandButton = document.createElement('button');
  expandButton.className = 'mermaid-action-btn';
  expandButton.title = 'Agrandir le diagramme';
  expandButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    </svg>
    <span>Agrandir</span>
  `;
  
  const handleExpandClick = () => {
    openMermaidModal(mermaidContent);
  };
  
  expandButton.addEventListener('click', handleExpandClick);
  
  // Ajouter les boutons à la barre d'outils
  toolbar.appendChild(copyButton);
  toolbar.appendChild(expandButton);
  
  // Indicateur de chargement
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'mermaid-loading-content';
  loadingIndicator.innerHTML = `
    <div class="mermaid-spinner"></div>
    <span>Rendu du diagramme...</span>
  `;
  
  // Ajouter la barre d'outils et l'indicateur au conteneur
  container.appendChild(toolbar);
  container.appendChild(loadingIndicator);
  
  // Rendre le diagramme Mermaid de manière asynchrone
  renderMermaidDiagram(container, mermaidContent, copyTimeout);
  
  return {
    dom: container,
    contentDOM: null, // Pas de contentDOM pour Mermaid
  };
}

// Fonction pour rendre un bloc de code normal
function renderCodeBlock(node: Node, language: string) {
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.className = 'code-block-container';

  // Créer le bloc de code standard
  const pre = document.createElement('pre');
  const code = document.createElement('code');

  if (language) {
    code.className = 'language-' + language;
  }
  pre.appendChild(code);
  
  const button = document.createElement('button');
  button.className = 'code-copy-button';
  button.title = 'Copier le code';
  
  const copyIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
  const checkIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  
  let copyTimeout: NodeJS.Timeout | null = null;
  
  const handleCopyClick = () => {
    navigator.clipboard.writeText(node.textContent).then(() => {
      button.innerHTML = checkIcon;
      button.style.color = 'var(--accent-primary)';
      button.classList.add('copied');
      
      // Nettoyer le timeout précédent
      if (copyTimeout) {
        clearTimeout(copyTimeout);
      }
      
      copyTimeout = setTimeout(() => {
        button.innerHTML = copyIcon;
        button.style.color = '';
        button.classList.remove('copied');
      }, 2000);
    });
  };
  
  button.innerHTML = copyIcon;
  button.addEventListener('click', handleCopyClick);

  container.append(pre, button);

  return {
    dom: container,
    contentDOM: code,
  };
}

// Fonction pour rendre le diagramme Mermaid (utilise la config centralisée)
async function renderMermaidDiagram(container: HTMLElement, mermaidContent: string, copyTimeout: NodeJS.Timeout | null) {
  try {
    // Initialiser Mermaid avec la configuration centralisée
    await initializeMermaid();

    // Importer Mermaid dynamiquement
    const mermaid = await import('mermaid');

    // Normaliser le contenu Mermaid
    const normalizedContent = normalizeMermaidContent(mermaidContent);
    
    // Générer un ID unique
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Rendre le diagramme
    const result = await mermaid.default.render(id, normalizedContent);
    
    if (result && result.svg) {
      // Supprimer l'indicateur de chargement
      container.innerHTML = '';
      
      // Recréer la barre d'outils
      const toolbar = document.createElement('div');
      toolbar.className = 'mermaid-actions';
      toolbar.style.position = 'absolute';
      toolbar.style.top = '8px';
      toolbar.style.right = '8px';
      toolbar.style.zIndex = '10';
      
      // Bouton Copier
      const copyButton = document.createElement('button');
      copyButton.className = 'mermaid-action-btn mermaid-copy-btn';
      copyButton.title = 'Copier le code Mermaid';
      copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copier</span>
      `;
      
      const handleCopyClick = () => {
        navigator.clipboard.writeText(mermaidContent).then(() => {
          copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copié !</span>
          `;
          copyButton.style.color = '#f97316';
          
          // Nettoyer le timeout précédent
          if (copyTimeout) {
            clearTimeout(copyTimeout);
          }
          
          copyTimeout = setTimeout(() => {
            copyButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copier</span>
            `;
            copyButton.style.color = '';
          }, 2000);
        });
      };
      
      copyButton.addEventListener('click', handleCopyClick);
      
      // Bouton Agrandir
      const expandButton = document.createElement('button');
      expandButton.className = 'mermaid-action-btn';
      expandButton.title = 'Agrandir le diagramme';
      expandButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
        <span>Agrandir</span>
      `;
      
      const handleExpandClick = () => {
        openMermaidModal(mermaidContent);
      };
      
      expandButton.addEventListener('click', handleExpandClick);
      
      toolbar.appendChild(copyButton);
      toolbar.appendChild(expandButton);
      
      // Créer le conteneur SVG
      const svgContainer = document.createElement('div');
      svgContainer.className = 'mermaid-svg-container';
      svgContainer.innerHTML = result.svg;
      
      // Mettre à jour les classes du conteneur
      container.className = 'mermaid-container mermaid-editor mermaid-rendered';
      
      // Ajouter la barre d'outils et le conteneur SVG
      container.appendChild(toolbar);
      container.appendChild(svgContainer);
    } else {
      throw new Error('Format de réponse Mermaid invalide');
    }
    
      } catch (error) {
      logger.error('Erreur lors du rendu Mermaid dans l\'éditeur:', error);
    
    // Afficher l'erreur
    container.innerHTML = `
      <div class="mermaid-error-content">
        <div class="mermaid-error-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>Erreur de rendu du diagramme</span>
        </div>
        <div class="mermaid-error-body">
          <div class="mermaid-error-message">
            <strong>Erreur :</strong>
            <pre>${error instanceof Error ? error.message : 'Erreur inconnue'}</pre>
          </div>
          <details class="mermaid-error-details">
            <summary>Code source</summary>
            <pre class="mermaid-source">${mermaidContent}</pre>
          </details>
        </div>
      </div>
    `;
    container.className = 'mermaid-container mermaid-editor mermaid-error';
  }
}

export default MermaidTiptapExtension;
