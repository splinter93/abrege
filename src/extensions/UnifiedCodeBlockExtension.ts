/**
 * Extension Tiptap pour les blocs de code unifiés (Mermaid + Code standard)
 * Utilise la configuration centralisée avec rendu DOM direct
 */

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Node } from '@tiptap/pm/model';
import { openMermaidModal } from '@/components/mermaid/MermaidModal';
import { normalizeMermaidContent } from '@/components/chat/mermaidService';
import { initializeMermaid } from '@/services/mermaid/mermaidConfig';
import { simpleLogger as logger } from '@/utils/logger';
import { NodeViewProps } from '@tiptap/react';
import { createCodeBlockToolbar } from './CodeBlockToolbar';
import '@/styles/UnifiedToolbar.css';

const UnifiedCodeBlockExtension = CodeBlockLowlight.extend({
  name: 'codeBlock', // Nom standard pour remplacer l'extension native
  
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight: {},
      defaultLanguage: null,
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const language = node.attrs.language;
      if (language === 'mermaid') {
        return createMermaidNodeView(node, getPos, editor);
      } else {
        return createCodeBlockNodeView(node, getPos, editor);
      }
    };
  },
});

// =================================================================
// MERMAID NODE VIEW
// =================================================================

function createMermaidNodeView(node: Node, getPos: () => number, editor: NodeViewProps['editor']) {
  const container = document.createElement('div');
  container.className = 'mermaid-container mermaid-editor mermaid-loading';
  
  const toolbar = createMermaidToolbar(node, getPos, editor, container);
  container.appendChild(toolbar);
  
  renderMermaidDiagram(container, node.textContent);
  
  return {
    dom: container,
    contentDOM: undefined, // Pas de contentDOM pour Mermaid
    update: (updatedNode: Node) => {
      if (updatedNode.type.name !== 'codeBlock') return false;
      // Re-render on content change
      if (updatedNode.textContent !== node.textContent) {
        renderMermaidDiagram(container, updatedNode.textContent);
        // Mettre à jour le type de diagramme dans la toolbar
        const typeSpan = toolbar.querySelector('.toolbar-label') as HTMLSpanElement;
        if (typeSpan) {
            typeSpan.textContent = getMermaidDiagramType(updatedNode.textContent);
        }
      }
      return true;
    },
  };
}

// =================================================================
// STANDARD CODE BLOCK NODE VIEW
// =================================================================

function createCodeBlockNodeView(node: Node, getPos: () => number, editor: NodeViewProps['editor']) {
  const container = document.createElement('div');
  container.className = 'code-block-container';

  const toolbar = createCodeBlockToolbar(node, getPos, editor, container);
  container.appendChild(toolbar);

  const pre = document.createElement('pre');
  const code = document.createElement('code');

  // IMPORTANT: Ces attributs sont essentiels pour Tiptap/Lowlight
  if (node.attrs.language) {
    code.className = `language-${node.attrs.language} hljs`;
  } else {
    code.className = 'hljs';
  }
  
  // Cet attribut est essentiel pour que Tiptap gère le contenu
  code.setAttribute('data-node-view-content', '');

  pre.appendChild(code);
  container.appendChild(pre);

  // Appliquer la coloration syntaxique immédiatement
  if (node.attrs.language && node.textContent) {
    try {
      const lowlight = editor.storage.lowlight;
      if (lowlight && lowlight.highlight) {
        const result = lowlight.highlight(node.textContent, node.attrs.language);
        code.innerHTML = result.value;
      }
    } catch (error) {
      logger.warn('Erreur coloration syntaxique:', error);
      // Fallback : afficher le code brut sans coloration
      code.textContent = node.textContent;
    }
  }

  return {
    dom: container,
    contentDOM: code, // Tiptap gère le contenu de cet élément
    update: (updatedNode: Node) => {
      if (updatedNode.type.name !== 'codeBlock') {
        return false;
      }
      // La langue a peut-être changé
      if (updatedNode.attrs.language !== node.attrs.language) {
        // Mettre à jour la toolbar si la langue change
        const newToolbar = createCodeBlockToolbar(updatedNode, getPos, editor, container);
        const oldToolbar = container.querySelector('.unified-toolbar');
        if (oldToolbar && newToolbar) {
          container.replaceChild(newToolbar, oldToolbar);
        }
        
        // Mettre à jour la classe du code
        if (updatedNode.attrs.language) {
          code.className = `language-${updatedNode.attrs.language} hljs`;
        } else {
          code.className = 'hljs';
        }
        
        // Re-appliquer la coloration syntaxique
        if (updatedNode.attrs.language && updatedNode.textContent) {
          try {
            const lowlight = editor.storage.lowlight;
            if (lowlight && lowlight.highlight) {
              const result = lowlight.highlight(updatedNode.textContent, updatedNode.attrs.language);
              code.innerHTML = result.value;
            }
          } catch (error) {
            logger.warn('Erreur coloration syntaxique:', error);
            // Fallback : afficher le code brut sans coloration
            code.textContent = updatedNode.textContent;
          }
        }
      }
      return true;
    },
  };
}

// =================================================================
// MERMAID-SPECIFIC HELPERS (UNCHANGED FOR NOW)
// =================================================================

// Fonction pour créer la toolbar Mermaid
function createMermaidToolbar(node: Node, getPos: NodeViewProps['getPos'], editor: NodeViewProps['editor'], container: HTMLElement) {
  const toolbar = document.createElement('div');
  toolbar.className = 'unified-toolbar mermaid-toolbar'; // Utiliser les classes unifiées
  
  // Type de diagramme à gauche
  const typeContainer = document.createElement('div');
  typeContainer.className = 'toolbar-left';
  
  const diagramType = document.createElement('span');
  diagramType.className = 'toolbar-label';
  diagramType.textContent = getMermaidDiagramType(node.textContent);
  
  typeContainer.appendChild(diagramType);
  
  // Boutons d'action à droite
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'toolbar-right';
  
  // Bouton Éditer avec fonctionnalité de basculement
  const editButton = document.createElement('button');
  editButton.className = 'toolbar-btn mermaid-edit-btn';
  editButton.title = 'Éditer le diagramme';
  editButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  `;
  
  // Gestion du mode édition
  let isEditMode = false;
  
  const handleEditClick = () => {
    if (isEditMode) {
      // Sortir du mode édition et re-rendre
      exitEditMode(container, node, getPos());
    } else {
      // Entrer en mode édition
      enterEditMode(container, node, getPos());
    }
  };
  
  editButton.addEventListener('click', handleEditClick);
  
  // Bouton Copier
  const copyButton = document.createElement('button');
  copyButton.className = 'toolbar-btn mermaid-copy-btn copy-btn';
  copyButton.title = 'Copier le code Mermaid';
  copyButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  `;
  
  let copyTimeout: NodeJS.Timeout | null = null;
  
  const handleCopyClick = () => {
    navigator.clipboard.writeText(node.textContent).then(() => {
      copyButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      `;
      copyButton.classList.add('copied');
      
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
        copyButton.classList.remove('copied');
      }, 2000);
    });
  };
  
  copyButton.addEventListener('click', handleCopyClick);
  
  // Bouton Agrandir
  const expandButton = document.createElement('button');
  expandButton.className = 'toolbar-btn mermaid-expand-btn';
  expandButton.title = 'Agrandir le diagramme';
  expandButton.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  `;
  
  const handleExpandClick = () => {
    openMermaidModal(node.textContent);
  };
  
  expandButton.addEventListener('click', handleExpandClick);
  
  // Fonction pour entrer en mode édition
  const enterEditMode = (container: HTMLElement, node: Node) => {
    isEditMode = true;
    
    // Ajouter la classe d'édition au container
    container.classList.add('mermaid-edit-mode');
    
    // Changer l'icône du bouton (crayon → œil)
    editButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
    editButton.title = 'Voir le diagramme';
    
    // Masquer le contenu SVG et afficher le textarea
    const svgContainer = container.querySelector('.mermaid-svg-container') as HTMLElement;
    if (svgContainer) {
      svgContainer.style.display = 'none';
    }
    
    // Créer le textarea d'édition
    const textarea = document.createElement('textarea');
    textarea.className = 'mermaid-edit-textarea font-monospace';
    textarea.value = node.textContent;
    
    // Fonction pour auto-resize le textarea
    const autoResize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    // Isoler les événements du textarea pour ne pas interférer avec Tiptap
    const stopPropagation = (e: Event) => e.stopPropagation();
    textarea.addEventListener('input', autoResize);
    textarea.addEventListener('paste', (e) => {
      stopPropagation(e);
      setTimeout(autoResize, 0);
    });
    textarea.addEventListener('keydown', stopPropagation);
    textarea.addEventListener('keyup', stopPropagation);
    textarea.addEventListener('keypress', stopPropagation);
    textarea.addEventListener('mousedown', stopPropagation);
    
    // Ajouter le textarea après la toolbar
    container.insertBefore(textarea, container.children[1]);
    
    // Auto-resize initial après un court délai pour être sûr que tout est rendu
    setTimeout(autoResize, 0);
    
    // Focus sur le textarea
    textarea.focus();
    textarea.select();
  };
  
  // Fonction pour sortir du mode édition
  const exitEditMode = (container: HTMLElement, node: Node, pos: number) => {
    isEditMode = false;
    
    // Retirer la classe d'édition du container
    container.classList.remove('mermaid-edit-mode');
    
    // Récupérer le contenu modifié
    const textarea = container.querySelector('.mermaid-edit-textarea');
    if (textarea) {
      const newContent = (textarea as HTMLTextAreaElement).value;
      
      // Mettre à jour le contenu original
      const transaction = editor.view.state.tr.replaceWith(
        pos + 1,
        pos + node.nodeSize - 1,
        editor.schema.text(newContent)
      );
      editor.view.dispatch(transaction);
      
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
    
    // Restaurer l'icône du bouton (œil → crayon complet)
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
    return 'FLOWCHART';
  } else if (normalized.startsWith('sequencediagram')) {
    return 'SEQUENCE';
  } else if (normalized.startsWith('classdiagram')) {
    return 'CLASS';
  } else if (normalized.startsWith('pie')) {
    return 'PIE';
  } else if (normalized.startsWith('gantt')) {
    return 'GANTT';
  } else if (normalized.startsWith('gitgraph')) {
    return 'GITGRAPH';
  } else if (normalized.startsWith('journey')) {
    return 'JOURNEY';
  } else if (normalized.startsWith('er')) {
    return 'ER';
  } else if (normalized.startsWith('statediagram')) {
    return 'STATE';
  } else {
    return 'DIAGRAM';
  }
}

// Fonction pour rendre le diagramme Mermaid (utilise la config centralisée)
async function renderMermaidDiagram(container: HTMLElement, mermaidContent: string) {
  try {
    // Initialiser Mermaid avec la configuration centralisée
    await initializeMermaid();

    // Importer Mermaid dynamiquement
    const mermaid = await import('mermaid');

    // **VALIDATION EN AMONT** : Vérifier la syntaxe avant le rendu
    try {
      await mermaid.default.parse(mermaidContent);
    } catch (e) {
      // Si la validation échoue, on lance une erreur pour être attrapé par le bloc catch principal
      if (e instanceof Error) {
        throw new Error(`Erreur de syntaxe Mermaid: ${e.message}`);
      }
      throw new Error('Erreur de syntaxe Mermaid inconnue.');
    }

    // Normaliser le contenu Mermaid
    const normalizedContent = normalizeMermaidContent(mermaidContent);
    
    // Générer un ID unique
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Rendre le diagramme
    const result = await mermaid.default.render(id, normalizedContent);
    
    if (result && result.svg) {
      // Nettoyer le contenu (garder la toolbar)
      const toolbar = container.querySelector('.unified-toolbar');
      container.innerHTML = '';
      if (toolbar) container.appendChild(toolbar);

      // Créer le conteneur SVG
      const svgContainer = document.createElement('div');
      svgContainer.className = 'mermaid-svg-container';
      svgContainer.innerHTML = result.svg;
      
      // Mettre à jour les classes du conteneur
      container.className = 'mermaid-container mermaid-editor mermaid-rendered';
      
      // Ajouter le conteneur SVG après la toolbar
      container.appendChild(svgContainer);
    } else {
      throw new Error('Format de réponse Mermaid invalide');
    }
    
  } catch (error) {
    logger.error('Erreur lors du rendu Mermaid dans l\'éditeur:', error);
    
    // Nettoyer le contenu (garder la toolbar)
    const toolbar = container.querySelector('.unified-toolbar');
    container.innerHTML = '';
    if (toolbar) container.appendChild(toolbar);
    
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
      <div class="mermaid-error-message">
        <strong>Cause :</strong>
        <pre>${error instanceof Error ? error.message : 'Erreur inconnue'}</pre>
      </div>
    `;
    
    // Mettre à jour les classes du conteneur
    container.className = 'mermaid-container mermaid-editor mermaid-error';
    
    // Ajouter le contenu d'erreur après la toolbar
    container.appendChild(errorContent);
  }
}

export default UnifiedCodeBlockExtension;
