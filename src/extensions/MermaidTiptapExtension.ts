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
  
  // Créer la toolbar avec boutons
  const toolbar = createMermaidToolbar(mermaidContent, container);
  
  // Indicateur de chargement
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'mermaid-loading-content';
  loadingIndicator.innerHTML = `
    <div class="mermaid-spinner"></div>
    <span>Rendu du diagramme...</span>
  `;
  
  // Ajouter la toolbar et l'indicateur au conteneur
  container.appendChild(toolbar);
  container.appendChild(loadingIndicator);
  
  // Rendre le diagramme Mermaid de manière asynchrone
  renderMermaidDiagram(container, mermaidContent);
  
  return {
    dom: container,
    contentDOM: null, // Pas de contentDOM pour Mermaid
  };
}

// Fonction pour créer la toolbar Mermaid
function createMermaidToolbar(mermaidContent: string, container: HTMLElement) {
  const toolbar = document.createElement('div');
  toolbar.className = 'mermaid-toolbar mermaid-toolbar-editor';
  
  // Type de diagramme à gauche
  const typeContainer = document.createElement('div');
  typeContainer.className = 'mermaid-toolbar-type';
  
  const diagramType = document.createElement('span');
  diagramType.className = 'mermaid-toolbar-diagram-type';
  diagramType.textContent = getMermaidDiagramType(mermaidContent);
  
  typeContainer.appendChild(diagramType);
  
  // Boutons d'action à droite
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'mermaid-toolbar-actions';
  
  // Bouton Éditer avec fonctionnalité de basculement
  const editButton = document.createElement('button');
  editButton.className = 'mermaid-toolbar-btn mermaid-edit-btn';
  editButton.title = 'Éditer le diagramme';
  editButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  `;
  
  // Gestion du mode édition
  let isEditMode = false;
  let originalContent = mermaidContent;
  
  const handleEditClick = () => {
    if (isEditMode) {
      // Sortir du mode édition et re-rendre
      exitEditMode();
    } else {
      // Entrer en mode édition
      enterEditMode();
    }
  };
  
  editButton.addEventListener('click', handleEditClick);
  
  // Bouton Copier
  const copyButton = document.createElement('button');
  copyButton.className = 'mermaid-toolbar-btn mermaid-copy-btn';
  copyButton.title = 'Copier le code Mermaid';
  copyButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  `;
  
  let copyTimeout: NodeJS.Timeout | null = null;
  
  const handleCopyClick = () => {
    navigator.clipboard.writeText(mermaidContent).then(() => {
      copyButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      `;
      copyButton.style.color = '#10b981';
      
      // Nettoyer le timeout précédent
      if (copyTimeout) {
        clearTimeout(copyTimeout);
      }
      
      copyTimeout = setTimeout(() => {
        copyButton.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        `;
        copyButton.style.color = '';
      }, 2000);
    });
  };
  
  copyButton.addEventListener('click', handleCopyClick);
  
  // Bouton Agrandir
  const expandButton = document.createElement('button');
  expandButton.className = 'mermaid-toolbar-btn mermaid-expand-btn';
  expandButton.title = 'Agrandir le diagramme';
  expandButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  `;
  
  const handleExpandClick = () => {
    openMermaidModal(mermaidContent);
  };
  
  expandButton.addEventListener('click', handleExpandClick);
  
  // Fonction pour entrer en mode édition
  const enterEditMode = () => {
    isEditMode = true;
    
    // Changer l'icône du bouton (crayon → checkmark)
    editButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    editButton.title = 'Valider et re-rendre';
    
    // Masquer le contenu SVG et afficher le textarea
    const svgContainer = container.querySelector('.mermaid-svg-container') as HTMLElement;
    if (svgContainer) {
      svgContainer.style.display = 'none';
    }
    
    // Créer le textarea d'édition
    const textarea = document.createElement('textarea');
    textarea.className = 'mermaid-edit-textarea';
    textarea.value = originalContent;
    textarea.style.cssText = `
      width: 100%;
      min-height: 200px;
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      line-height: 1.5;
      background: #f9fafb;
      color: #374151;
      resize: vertical;
      outline: none;
    `;
    
    // Ajouter le textarea après la toolbar
    container.insertBefore(textarea, container.children[1]);
    
    // Focus sur le textarea
    textarea.focus();
    textarea.select();
  };
  
  // Fonction pour sortir du mode édition
  const exitEditMode = () => {
    isEditMode = false;
    
    // Récupérer le contenu modifié
    const textarea = container.querySelector('.mermaid-edit-textarea');
    if (textarea) {
      const newContent = (textarea as HTMLTextAreaElement).value;
      
      // Mettre à jour le contenu original
      originalContent = newContent;
      
      // Supprimer le textarea
      textarea.remove();
      
      // Re-afficher le contenu SVG
      const svgContainer = container.querySelector('.mermaid-svg-container') as HTMLElement;
      if (svgContainer) {
        svgContainer.style.display = 'block';
      }
      
      // Re-rendre le diagramme avec le nouveau contenu
      renderMermaidDiagram(container, newContent);
    }
    
    // Restaurer l'icône du bouton (checkmark → crayon)
    editButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    `;
    editButton.title = 'Éditer le diagramme';
  };
  
  // Assembler la toolbar
  actionsContainer.appendChild(editButton);
  actionsContainer.appendChild(copyButton);
  actionsContainer.appendChild(expandButton);
  
  toolbar.appendChild(typeContainer);
  toolbar.appendChild(actionsContainer);
  
  return toolbar;
}

// Fonction pour détecter le type de diagramme (version simplifiée)
function getMermaidDiagramType(content: string): string {
  const normalized = content.trim().toLowerCase();
  
  if (normalized.startsWith('flowchart') || normalized.startsWith('graph')) {
    return 'Flowchart';
  } else if (normalized.startsWith('sequencediagram')) {
    return 'Sequence';
  } else if (normalized.startsWith('classdiagram')) {
    return 'Class';
  } else if (normalized.startsWith('pie')) {
    return 'Pie';
  } else if (normalized.startsWith('gantt')) {
    return 'Gantt';
  } else if (normalized.startsWith('gitgraph')) {
    return 'GitGraph';
  } else if (normalized.startsWith('journey')) {
    return 'Journey';
  } else if (normalized.startsWith('er')) {
    return 'ER';
  } else if (normalized.startsWith('statediagram')) {
    return 'State';
  } else {
    return 'Diagram';
  }
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
async function renderMermaidDiagram(container: HTMLElement, mermaidContent: string) {
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
      
      // Recréer la toolbar
      const toolbar = createMermaidToolbar(mermaidContent, container);
      
      // Créer le conteneur SVG
      const svgContainer = document.createElement('div');
      svgContainer.className = 'mermaid-svg-container';
      svgContainer.innerHTML = result.svg;
      
      // Mettre à jour les classes du conteneur
      container.className = 'mermaid-container mermaid-editor mermaid-rendered';
      
      // Ajouter la toolbar et le conteneur SVG
      container.appendChild(toolbar);
      container.appendChild(svgContainer);
    } else {
      throw new Error('Format de réponse Mermaid invalide');
    }
    
  } catch (error) {
    logger.error('Erreur lors du rendu Mermaid dans l\'éditeur:', error);
    
    // Supprimer le contenu existant
    container.innerHTML = '';
    
          // Recréer la toolbar même en cas d'erreur
      const toolbar = createMermaidToolbar(mermaidContent, container);
    
    // Créer le contenu d'erreur
    const errorContent = document.createElement('div');
    errorContent.className = 'mermaid-error-content';
    errorContent.innerHTML = `
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
    `;
    
    // Mettre à jour les classes du conteneur
    container.className = 'mermaid-container mermaid-editor mermaid-error';
    
    // Ajouter la toolbar et le contenu d'erreur
    container.appendChild(toolbar);
    container.appendChild(errorContent);
  }
}

export default MermaidTiptapExtension;
