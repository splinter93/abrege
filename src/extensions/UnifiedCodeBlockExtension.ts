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
import { NodeViewProps, Editor } from '@tiptap/react';
import { createCodeBlockToolbar } from './CodeBlockToolbar';
import '@/styles/UnifiedToolbar.css';

/**
 * Type pour l'extension parent (CodeBlockLowlight)
 */
interface CodeBlockLowlightExtension {
  parent?: () => Record<string, unknown>;
}

/**
 * Type pour le storage de l'éditeur avec lowlight
 */
interface EditorStorage {
  lowlight?: {
    highlight: (code: string, language: string) => { value: string };
  };
}

/**
 * Type pour l'éditeur avec storage lowlight
 * Utilise une intersection type pour étendre le storage existant
 */
type EditorWithStorage = Editor & {
  storage: Editor['storage'] & EditorStorage;
};

/**
 * Nettoie TOUS les SVG Mermaid orphelins du DOM
 * Ces SVG d'erreur sont ajoutés directement au <body> par Mermaid et restent collés
 */
function cleanupMermaidSVGs() {
  try {
    // Nettoyer tous les SVG avec id mermaid-* directement dans le body
    const orphanedSVGs = document.querySelectorAll('body > svg[id^="mermaid-"]');
    orphanedSVGs.forEach(svg => {
      logger.dev('[Mermaid] Cleanup SVG orphelin:', svg.id);
      svg.remove();
    });
    
    // Nettoyer aussi les div temporaires que Mermaid pourrait créer
    const orphanedDivs = document.querySelectorAll('body > div[id^="dmermaid-"]');
    orphanedDivs.forEach(div => {
      logger.dev('[Mermaid] Cleanup div orphelin:', div.id);
      div.remove();
    });
  } catch (error) {
    logger.error('[Mermaid] Erreur cleanup SVG:', error);
  }
}

const UnifiedCodeBlockExtension = CodeBlockLowlight.extend({
  name: 'codeBlock', // Nom standard pour remplacer l'extension native
  
  addOptions() {
    const parentOptions = (this as unknown as CodeBlockLowlightExtension).parent?.() || {};
    return {
      ...parentOptions,
      lowlight: {},
      defaultLanguage: null,
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }: NodeViewProps) => {
      const language = node.attrs.language;
      // getPos peut être undefined dans NodeViewProps, on doit le gérer
      // Les fonctions attendent getPos: () => number, donc on crée une fonction qui retourne toujours un nombre
      const safeGetPos: () => number = getPos ? () => getPos() ?? 0 : () => 0;
      if (language === 'mermaid') {
        return createMermaidNodeView(node, safeGetPos, editor);
      } else {
        return createCodeBlockNodeView(node, safeGetPos, editor);
      }
    };
  },

  onDestroy() {
    // ✅ Nettoyer TOUS les SVG Mermaid orphelins du DOM (erreurs qui restent collées)
    cleanupMermaidSVGs();
  },
});

// =================================================================
// MERMAID NODE VIEW
// =================================================================

function createMermaidNodeView(node: Node, getPos: () => number, editor: NodeViewProps['editor']) {
  const container = document.createElement('div');
  // Utilisation des nouvelles classes unifiées
  container.className = 'u-block u-block--mermaid';
  
  const toolbar = createMermaidToolbar(node, getPos, editor, container);
  container.appendChild(toolbar);

  const body = document.createElement('div');
  body.className = 'u-block__body';
  container.appendChild(body);
  
  renderMermaidDiagram(body, node.textContent); // On rend dans le body
  
  return {
    dom: container,
    contentDOM: undefined,
    update: (updatedNode: Node) => {
      if (updatedNode.type.name !== 'codeBlock') return false;
      if (updatedNode.textContent !== node.textContent) {
        renderMermaidDiagram(body, updatedNode.textContent);
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
  // Utilisation des nouvelles classes unifiées
  container.className = 'u-block u-block--code';

  const toolbar = createCodeBlockToolbar(node, getPos, editor);
  container.appendChild(toolbar);

  const body = document.createElement('div');
  body.className = 'u-block__body';
  
  const pre = document.createElement('pre');
  const code = document.createElement('code');

  // Les attributs restent importants pour Tiptap
  if (node.attrs.language) {
    code.className = `language-${node.attrs.language}`;
  }
  code.setAttribute('data-node-view-content', '');

  pre.appendChild(code);
  body.appendChild(pre);
  container.appendChild(body);

  return {
    dom: container,
    contentDOM: code, 
    update: (updatedNode: Node) => {
      if (updatedNode.type.name !== 'codeBlock') {
        return false;
      }
      // La langue a peut-être changé
      if (updatedNode.attrs.language !== node.attrs.language) {
        // Mettre à jour la toolbar si la langue change
        const newToolbar = createCodeBlockToolbar(updatedNode, getPos, editor);
        const oldToolbar = container.querySelector('.unified-toolbar');
        if (oldToolbar && newToolbar) {
          container.replaceChild(newToolbar, oldToolbar);
        }
        
        // Mettre à jour la classe du code
        if (updatedNode.attrs.language) {
          code.className = `language-${updatedNode.attrs.language}`;
        } else {
          code.className = 'hljs';
        }
        
        // Re-appliquer la coloration syntaxique
        if (updatedNode.attrs.language && updatedNode.textContent) {
          try {
            const editorWithStorage = editor as EditorWithStorage;
            const lowlight = editorWithStorage.storage?.lowlight;
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
  // Classes de la toolbar unifiée
  toolbar.className = 'u-block__toolbar';
  
  // Type de diagramme à gauche
  const leftContainer = document.createElement('div');
  leftContainer.className = 'toolbar-left';
  
  const diagramType = document.createElement('span');
  diagramType.className = 'toolbar-label';
  diagramType.textContent = getMermaidDiagramType(node.textContent);
  
  leftContainer.appendChild(diagramType);
  
  // Boutons d'action à droite
  const rightContainer = document.createElement('div');
  rightContainer.className = 'toolbar-right';
  
  // Bouton Éditer avec fonctionnalité de basculement
  const editButton = document.createElement('button');
  editButton.className = 'toolbar-btn';
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
    const rawPos = typeof getPos === 'function' ? getPos() : 0;
    const pos = typeof rawPos === 'number' ? rawPos : 0;
    if (isEditMode) {
      // Sortir du mode édition et re-rendre
      exitEditMode(container, node, pos);
    } else {
      // Entrer en mode édition
      enterEditMode(container, node);
    }
  };
  
  editButton.addEventListener('click', handleEditClick);
  
  // Bouton Copier
  const copyButton = document.createElement('button');
  copyButton.className = 'toolbar-btn copy-btn';
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
  expandButton.className = 'toolbar-btn';
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
    const body = container.querySelector('.u-block__body') as HTMLElement;
    if (body) {
      body.style.display = 'none';
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
    container.appendChild(textarea);
    
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
      const body = container.querySelector('.u-block__body') as HTMLElement;
      if (body) {
        body.style.display = 'flex'; // ou 'block' selon le besoin
      }
      
      // Re-rendre le diagramme avec le nouveau contenu
      if (body) {
        renderMermaidDiagram(body, newContent);
      }
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
  rightContainer.appendChild(editButton);
  rightContainer.appendChild(copyButton);
  rightContainer.appendChild(expandButton);
  
  toolbar.appendChild(leftContainer);
  toolbar.appendChild(rightContainer);
  
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
      let svg = result.svg;
      
      // ✅ Laisser Mermaid gérer le layout - pas de transformation SVG
      
      // Nettoyer le contenu du body
      container.innerHTML = '';

      // Créer le conteneur SVG
      const svgContainer = document.createElement('div');
      svgContainer.className = 'mermaid-svg-container';
      svgContainer.innerHTML = svg;
      
      // Mettre à jour les classes du conteneur parent
      container.parentElement?.classList.remove('mermaid-loading');
      container.parentElement?.classList.add('mermaid-rendered');

      // Ajouter le conteneur SVG
      container.appendChild(svgContainer);
    } else {
      throw new Error('Format de réponse Mermaid invalide');
    }
    
  } catch (error) {
    logger.error('Erreur lors du rendu Mermaid dans l\'éditeur:', error);
    
    // ✅ CRITIQUE: Nettoyer les SVG orphelins que Mermaid a pu ajouter au body
    cleanupMermaidSVGs();
    
    // Nettoyer le contenu du body
    container.innerHTML = '';
    
    // Créer le contenu d'erreur
    const errorContent = document.createElement('div');
    errorContent.className = 'mermaid-error-content';
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    errorContent.innerHTML = `
      <div class="mermaid-error-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <div class="mermaid-error-title">Erreur de rendu du diagramme</div>
      <div class="mermaid-error-message">
        <strong>Cause :</strong>
        <pre class="mermaid-error-text">${errorMessage}</pre>
      </div>
      <button class="mermaid-error-copy-btn" title="Copier l'erreur">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>Copier l'erreur</span>
      </button>
    `;
    
    // Ajouter event listener pour copier
    const copyBtn = errorContent.querySelector('.mermaid-error-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(errorMessage);
          const span = copyBtn.querySelector('span');
          if (span) {
            const originalText = span.textContent;
            span.textContent = 'Copié !';
            setTimeout(() => { span.textContent = originalText; }, 2000);
          }
        } catch (err) {
          logger.error('[Mermaid] Erreur copie:', err);
        }
      });
    }
    
    // Mettre à jour les classes du conteneur parent
    container.parentElement?.classList.remove('mermaid-loading');
    container.parentElement?.classList.add('mermaid-error');
    
    // Ajouter le contenu d'erreur
    container.appendChild(errorContent);
  }
}

export default UnifiedCodeBlockExtension;
