/**
 * Extension Notion Drag Handle - MÉTHODE OFFICIELLE TIPTAP
 * Utilise view.dragging pour laisser ProseMirror gérer le déplacement
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { getSelectionRanges, NodeRangeSelection } from '@tiptap/extension-node-range';
import type { EditorView } from '@tiptap/pm/view';
import type { Node, Slice } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Type pour la propriété dragging de ProseMirror
 * Utilisée en interne par ProseMirror pour gérer le drag & drop
 */
interface DraggingInfo {
  slice: Slice;
  move: boolean;
}

export interface NotionDragHandleOptions {
  handleClass?: string;
  onNodeChange?: (options: { node: Node; pos: number; editor: EditorState }) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Version du handle pour forcer la recréation après changements de design */
const HANDLE_VERSION = 'v5.7'; // Memory leaks fixed, listeners cleanup

/** Offsets pour positionnement des handles */
const HANDLE_LEFT_OFFSET = -80; // px à gauche du bloc
const HANDLE_TOP_OFFSET = 6; // px du haut du bloc

/** Largeur de la zone hover bridge (zone invisible à gauche) */
const HOVER_BRIDGE_WIDTH = 160; // px

/** Délais avant hide des handles */
const HIDE_DELAY_HANDLES = 200; // ms quand on quitte les handles
const HIDE_DELAY_EDITOR = 300; // ms quand on quitte l'éditeur

/** Délai pour cleanup de la drag image */
const DRAG_IMAGE_CLEANUP_DELAY = 100; // ms

/** Délai après dragend pour reset sélection */
const DRAGEND_SELECTION_DELAY = 100; // ms

// ============================================================================
// VARIABLES GLOBALES MODULE
// ============================================================================

let globalDragHandle: HTMLElement | null = null;
let globalDragHandleCleanup: (() => void) | null = null; // Cleanup listeners
let currentView: EditorView | null = null;
let hideTimeout: NodeJS.Timeout | null = null;
let hoverBridge: HTMLElement | null = null;
let listenersAttached = false;

/**
 * Créer une zone invisible à gauche de l'éditeur
 * Permet de garder les handles visibles quand la souris va vers eux
 */
function createHoverBridge(): HTMLElement {
  const bridge = document.createElement('div');
  bridge.className = 'notion-hover-bridge';
  bridge.style.position = 'absolute';
  bridge.style.left = `-${HOVER_BRIDGE_WIDTH}px`;
  bridge.style.top = '0';
  bridge.style.width = `${HOVER_BRIDGE_WIDTH}px`;
  bridge.style.height = '100%';
  bridge.style.zIndex = '99'; // Sous les handles (z-index: 100)
  bridge.style.pointerEvents = 'auto';
  bridge.style.background = 'transparent';
  // bridge.style.background = 'rgba(255, 0, 0, 0.1)'; // DEBUG: décommenter pour voir la zone
  
  // ✅ FIX: Listeners sur la bridge pour maintenir les handles
  bridge.addEventListener('mouseenter', () => {
    // Annuler le timeout de hide
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });
  
  bridge.addEventListener('mousemove', (e: MouseEvent) => {
    // Annuler le timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    
    // Détecter quel bloc est à la hauteur Y de la souris
    if (currentView && globalDragHandle) {
      const editorRect = currentView.dom.getBoundingClientRect();
      const mouseY = e.clientY;
      
      // Trouver tous les blocs de premier niveau
      const blocks = Array.from(currentView.dom.children) as HTMLElement[];
      
      for (const block of blocks) {
        const blockRect = block.getBoundingClientRect();
        
        // Si la souris est à la hauteur de ce bloc
        if (mouseY >= blockRect.top && mouseY <= blockRect.bottom) {
          // Positionner les handles sur ce bloc
          globalDragHandle.style.left = `${blockRect.left - editorRect.left + HANDLE_LEFT_OFFSET}px`;
          globalDragHandle.style.top = `${blockRect.top - editorRect.top + HANDLE_TOP_OFFSET}px`;
          globalDragHandle.style.opacity = '1';
          
          // Sauvegarder la position du bloc
          try {
            const blockStartPos = currentView.posAtDOM(block, 0);
            globalDragHandle.setAttribute('data-node-pos', blockStartPos.toString());
          } catch (error) {
            logger.dev('[NotionDragHandle] Erreur posAtDOM dans bridge:', error);
          }
          
          break;
        }
      }
    }
  });
  
  bridge.addEventListener('mouseleave', () => {
    // Délai avant de cacher
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    hideTimeout = setTimeout(() => {
      if (globalDragHandle) {
        globalDragHandle.style.opacity = '0';
      }
    }, HIDE_DELAY_HANDLES);
  });
  
  return bridge;
}

/**
 * Attacher les listeners drag/drop sur le handle
 * Retourne une fonction cleanup pour éviter les memory leaks
 */
function attachDragListeners(
  dragHandle: HTMLElement,
  view: EditorView
): () => void {
  const dragBtn = dragHandle.querySelector('.notion-drag-handle-btn') as HTMLElement;
  if (!dragBtn) {
    logger.error('[NotionDragHandle] dragBtn non trouvé dans attachDragListeners');
    return () => {}; // Cleanup vide
  }

  // Handler dragstart
  const handleDragStart = (e: DragEvent) => {
    const posStr = dragHandle.getAttribute('data-node-pos');
    const pos = posStr ? parseInt(posStr) : -1;

    if (pos >= 0 && e.dataTransfer) {
      const { doc } = view.state;
      const $pos = doc.resolve(pos);
      const node = $pos.nodeAfter;

      if (!node) return;

      // Créer les ranges avec getSelectionRanges (méthode Tiptap)
      const from = pos;
      const to = pos + node.nodeSize;
      const $from = doc.resolve(from);
      const $to = doc.resolve(to);

      const ranges = getSelectionRanges($from, $to, 0);

      if (!ranges.length) {
        return;
      }

      // Créer la sélection et la slice
      const selection = NodeRangeSelection.create(doc, from, to);
      const slice = selection.content();

      // ✅ MAGIE: Dire à ProseMirror qu'on drag
      // ProseMirror va AUTOMATIQUEMENT gérer le drop !
      (view as EditorView & { dragging?: DraggingInfo | null }).dragging = {
        slice,
        move: true,
      };

      // Sélectionner le bloc visuellement
      const tr = view.state.tr.setSelection(selection);
      view.dispatch(tr);

      // ✅ Créer une drag image custom avec STYLES selon le type de bloc
      try {
        // Extraire le texte du bloc
        let textContent = slice.content.textBetween(0, slice.content.size, '\n', '\n');
        if (!textContent || textContent.trim() === '') {
          textContent = node.type.name; // Fallback: nom du type de bloc
        }

        // Détecter le type de bloc pour adapter les styles
        const nodeType = node.type.name;
        const nodeLevel = node.attrs?.level || 0;

        // Styles de base
        let fontSize = '15px';
        let fontWeight = '400';
        let color = '#B5BCC4';

        // Adapter selon le type
        if (nodeType === 'heading') {
          fontWeight = '600';
          color = '#FFFFFF';
          switch (nodeLevel) {
            case 1:
              fontSize = '28px';
              fontWeight = '700';
              break;
            case 2:
              fontSize = '22px';
              fontWeight = '600';
              break;
            case 3:
              fontSize = '18px';
              fontWeight = '600';
              break;
            case 4:
              fontSize = '16px';
              fontWeight = '600';
              break;
            default:
              fontSize = '15px';
              fontWeight = '600';
          }
        } else if (nodeType === 'codeBlock') {
          fontSize = '14px';
          fontWeight = '400';
          color = '#A8B4C0';
        } else if (nodeType === 'blockquote') {
          fontSize = '15px';
          fontWeight = '400';
          color = '#8B95A0';
        }

        // Créer le wrapper pour la drag image
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          position: fixed;
          top: 0;
          left: -9999px;
          max-width: 500px;
          padding: 10px 14px;
          background: #1a1a1a;
          color: ${color};
          border-radius: 6px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.4);
          font-family: 'Noto Sans', sans-serif;
          font-size: ${fontSize};
          font-weight: ${fontWeight};
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          z-index: 99999;
        `;
        wrapper.textContent = textContent;

        document.body.appendChild(wrapper);

        // Forcer le reflow
        void wrapper.offsetHeight;

        // setDragImage DOIT être synchrone dans dragstart
        e.dataTransfer.setDragImage(wrapper, 10, 10);

        // Cleanup après le drag
        setTimeout(() => {
          if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
          }
        }, DRAG_IMAGE_CLEANUP_DELAY);
      } catch (err) {
        logger.error('[NotionDragHandle] Erreur drag image:', err);
      }
    }
  };

  // Handler dragend
  const handleDragEnd = () => {
    if (view) {
      // Attendre un peu que ProseMirror finisse le drop
      setTimeout(() => {
        const { tr, doc } = view.state;

        // Créer une TextSelection vide à la position courante
        const currentPos = view.state.selection.from;
        const selection = TextSelection.create(doc, currentPos);
        tr.setSelection(selection);
        view.dispatch(tr);
      }, DRAGEND_SELECTION_DELAY);
    }
  };

  // Attacher les listeners
  dragBtn.addEventListener('dragstart', handleDragStart as EventListener);
  dragBtn.addEventListener('dragend', handleDragEnd);

  // Retourner la fonction cleanup
  return () => {
    dragBtn.removeEventListener('dragstart', handleDragStart as EventListener);
    dragBtn.removeEventListener('dragend', handleDragEnd);
  };
}

function createDragHandle(): HTMLElement {
  // Créer le container pour les deux boutons (+ et ⋮⋮)
  const container = document.createElement('div');
  container.className = 'notion-drag-handle notion-handle-container';
  container.style.position = 'absolute';
  container.style.zIndex = '100';
  container.style.opacity = '0';
  container.style.transition = 'opacity 150ms ease, top 180ms cubic-bezier(0.22, 1, 0.36, 1), left 180ms cubic-bezier(0.22, 1, 0.36, 1)';
  container.style.display = 'flex';
  container.style.gap = '12px';  // Espacé 8→12
  container.style.alignItems = 'center';
  
  // Créer le bouton "+" (à gauche)
  const plusBtn = document.createElement('button');
  plusBtn.className = 'notion-plus-btn';
  plusBtn.title = 'Ajouter un bloc';
  plusBtn.style.width = '20px';  // Légèrement plus gros pour le cercle
  plusBtn.style.height = '20px';
  plusBtn.style.display = 'flex';
  plusBtn.style.alignItems = 'center';
  plusBtn.style.justifyContent = 'center';
  plusBtn.style.border = 'none';
  plusBtn.style.background = 'transparent';
  plusBtn.style.borderRadius = '0';
  plusBtn.style.cursor = 'pointer';
  plusBtn.style.color = 'var(--text-primary)';  // ✅ Couleur du texte
  plusBtn.style.filter = 'brightness(0.55)';    // ✅ 45% plus sombre (très discret)
  plusBtn.style.transition = 'all 150ms ease, filter 150ms ease';
  plusBtn.draggable = false; // ✅ Empêcher le + d'être draggable
  plusBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
  `;
  
  // Hover effect sur le bouton + (sans background)
  plusBtn.addEventListener('mouseenter', () => {
    plusBtn.style.background = 'transparent';
    plusBtn.style.filter = 'brightness(1)';  // ✅ Couleur normale au hover
  });
  plusBtn.addEventListener('mouseleave', () => {
    plusBtn.style.background = 'transparent';
    plusBtn.style.filter = 'brightness(0.55)';  // ✅ 45% plus sombre (très discret)
  });
  
  // ✅ Empêcher le drag du bouton +
  plusBtn.addEventListener('dragstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  
  // Click sur le bouton + pour créer une ligne vide sous le bloc
  plusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (currentView) {
      const pos = container.getAttribute('data-node-pos');
      if (pos) {
        const nodePos = parseInt(pos);
        const { state, dispatch } = currentView;
        const { doc, tr } = state;
        
        try {
          // Trouver le nœud actuel
          const $pos = doc.resolve(nodePos);
          const node = $pos.nodeAfter;
          
          if (node) {
            // Calculer la position après le bloc
            const afterPos = nodePos + node.nodeSize;
            
            // Insérer un nouveau paragraphe vide après le bloc
            const paragraph = state.schema.nodes.paragraph.create();
            const transaction = tr.insert(afterPos, paragraph);
            
            // Placer le curseur dans le nouveau paragraphe
            transaction.setSelection(
              TextSelection.near(transaction.doc.resolve(afterPos + 1))
            );
            
            dispatch(transaction);
            currentView.focus();
          }
        } catch (error) {
          logger.error('[NotionDragHandle] Erreur lors de la création de ligne:', error);
        }
      }
    }
  });
  
  // Créer le drag handle (⋮⋮) (à droite)
  const dragBtn = document.createElement('div');
  dragBtn.className = 'notion-drag-handle-btn';
  dragBtn.title = 'Glisser pour déplacer';
  dragBtn.style.width = '18px';  // Réduit 20→18
  dragBtn.style.height = '18px';  // Réduit 20→18
  dragBtn.style.display = 'flex';
  dragBtn.style.alignItems = 'center';
  dragBtn.style.justifyContent = 'center';
  dragBtn.style.cursor = 'grab';
  dragBtn.style.background = 'transparent';
  dragBtn.style.borderRadius = '4px';
  dragBtn.style.color = 'var(--text-primary)';  // ✅ Couleur du texte
  dragBtn.style.filter = 'brightness(0.55)';    // ✅ 45% plus sombre (très discret)
  dragBtn.style.transition = 'all 150ms ease, filter 150ms ease';
  dragBtn.innerHTML = `
    <svg width="14" height="22" viewBox="0 0 14 22" fill="currentColor">
      <circle cx="4" cy="4" r="1"/>
      <circle cx="10" cy="4" r="1"/>
      <circle cx="4" cy="11" r="1"/>
      <circle cx="10" cy="11" r="1"/>
      <circle cx="4" cy="18" r="1"/>
      <circle cx="10" cy="18" r="1"/>
      </svg>
  `;
  
  // Hover effect minimal (plus visible au hover)
  dragBtn.addEventListener('mouseenter', () => {
    dragBtn.style.background = 'transparent';
    dragBtn.style.filter = 'brightness(1)';  // ✅ Couleur normale au hover
  });
  dragBtn.addEventListener('mouseleave', () => {
    dragBtn.style.background = 'transparent';
    dragBtn.style.filter = 'brightness(0.55)';  // ✅ 45% plus sombre (très discret)
  });
  
  // ✅ Rendre UNIQUEMENT le dragBtn draggable
  dragBtn.draggable = true;
  container.draggable = false; // Container PAS draggable
  container.style.pointerEvents = 'auto';
  
  // ✅ FIX: Empêcher la disparition quand la souris entre dans les handles
  container.addEventListener('mouseenter', () => {
    // Annuler le timeout de hide
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    // Forcer la visibilité
    container.style.opacity = '1';
  });
  
  // ✅ FIX: Délai avant de cacher quand on quitte les handles
  container.addEventListener('mouseleave', () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    hideTimeout = setTimeout(() => {
      container.style.opacity = '0';
    }, HIDE_DELAY_HANDLES);
  });
  
  // Ajouter les boutons au container
  container.appendChild(plusBtn);
  container.appendChild(dragBtn);
  
  return container;
}

export const NotionDragHandleExtension = Extension.create<NotionDragHandleOptions>({
  name: 'notionDragHandle',

  addOptions() {
    return {
      handleClass: 'notion-drag-handle',
      onNodeChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('notionDragHandle'),

        view(view: EditorView) {
          // ✅ FIX: Double requestAnimationFrame pour garantir le DOM monté
          // Résout le problème de race condition lors de la navigation Next.js
          currentView = view;
          
          // Double RAF: garantit que le DOM est complètement rendu et monté
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // ✅ FIX: TOUJOURS détruire l'ancien handle pour forcer la recréation avec les nouveaux styles
              if (globalDragHandle) {
                // ✅ Nettoyer les listeners AVANT de détruire (FIX MEMORY LEAK)
                if (globalDragHandleCleanup) {
                  globalDragHandleCleanup();
                  globalDragHandleCleanup = null;
                }
                
                if (globalDragHandle.parentNode) {
                  globalDragHandle.parentNode.removeChild(globalDragHandle);
                }
                globalDragHandle = null;
              }
              
              // ✅ Détruire aussi la bridge pour la recréer
              if (hoverBridge) {
                if (hoverBridge.parentNode) {
                  hoverBridge.parentNode.removeChild(hoverBridge);
                }
                hoverBridge = null;
              }
              
              // ✅ Reset le flag listeners pour recréation
              listenersAttached = false;
              
              if (!globalDragHandle && view.dom) {
            globalDragHandle = createDragHandle();
                globalDragHandle.setAttribute('data-version', HANDLE_VERSION);
            
            // Trouver .tiptap-editor-container (grand-parent) au lieu du parent direct
            const editorElement = view.dom.closest('.tiptap-editor-container') || view.dom.parentElement;
            if (editorElement) {
              (editorElement as HTMLElement).style.position = 'relative';
              editorElement.appendChild(globalDragHandle);

              // ✅ Créer et ajouter la zone bridge
              if (!hoverBridge) {
                hoverBridge = createHoverBridge();
                editorElement.appendChild(hoverBridge);
              }

              // ✅ Attacher les listeners UNE SEULE FOIS
              if (!listenersAttached) {
                listenersAttached = true;
                globalDragHandleCleanup = attachDragListeners(globalDragHandle, view);
              }
            }
          }
            }); // Fin du 2ème RAF
          }); // Fin du 1er RAF

          // Retourner un objet de cleanup
          return {
            destroy: () => {
              // ✅ Nettoyer le timeout
              if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
              }
              
              // ✅ Nettoyer les listeners drag (FIX MEMORY LEAK)
              if (globalDragHandleCleanup) {
                globalDragHandleCleanup();
                globalDragHandleCleanup = null;
              }
              
              // ✅ Nettoyer les handles
              if (globalDragHandle && globalDragHandle.parentNode) {
                globalDragHandle.parentNode.removeChild(globalDragHandle);
                globalDragHandle = null;
              }
              
              // ✅ Nettoyer la bridge
              if (hoverBridge && hoverBridge.parentNode) {
                hoverBridge.parentNode.removeChild(hoverBridge);
                hoverBridge = null;
              }
              
              // ✅ Reset le flag listeners
              listenersAttached = false;
              
              currentView = null;
            }
          };
        },

        props: {
          handleDOMEvents: {
            mousemove: (view: EditorView, event: MouseEvent) => {
              currentView = view;
              
              // ✅ Annuler le timeout de hide si on survole un nouveau bloc
              if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
              }
              
              // ✅ FIX: Créer le handle si il n'existe pas encore (fallback de sécurité)
              // Utiliser RAF pour garantir le DOM prêt même dans le fallback
              // Détruire l'ancien handle s'il existe avec une version obsolète
              if (globalDragHandle && globalDragHandle.getAttribute('data-version') !== HANDLE_VERSION) {
                // ✅ Nettoyer les listeners AVANT de détruire (FIX MEMORY LEAK)
                if (globalDragHandleCleanup) {
                  globalDragHandleCleanup();
                  globalDragHandleCleanup = null;
                }
                
                if (globalDragHandle.parentNode) {
                  globalDragHandle.parentNode.removeChild(globalDragHandle);
                }
                globalDragHandle = null;
                
                // ✅ Détruire aussi la bridge
                if (hoverBridge && hoverBridge.parentNode) {
                  hoverBridge.parentNode.removeChild(hoverBridge);
                  hoverBridge = null;
                }
                
                // ✅ Reset le flag listeners pour recréation
                listenersAttached = false;
              }
              
              if (!globalDragHandle && view.dom) {
                requestAnimationFrame(() => {
                  if (!globalDragHandle && view.dom) {
                    globalDragHandle = createDragHandle();
                    globalDragHandle.setAttribute('data-version', HANDLE_VERSION);
                    // Trouver .tiptap-editor-container (grand-parent) au lieu du parent direct
                    const editorElement = view.dom.closest('.tiptap-editor-container') || view.dom.parentElement;
                    if (editorElement) {
                      (editorElement as HTMLElement).style.position = 'relative';
                      editorElement.appendChild(globalDragHandle);
                      
                      // ✅ Créer et ajouter la bridge (fallback)
                      if (!hoverBridge) {
                        hoverBridge = createHoverBridge();
                        editorElement.appendChild(hoverBridge);
                      }
                      
                      // ✅ FIX BUG: Attacher les listeners dans le fallback aussi !
                      if (!listenersAttached) {
                        listenersAttached = true;
                        globalDragHandleCleanup = attachDragListeners(globalDragHandle, view);
                      }
                  }
                }
                });
              }

              // Positionner le handle (vérifier qu'il existe d'abord)
              if (!globalDragHandle) return false;

              const coords = { left: event.clientX, top: event.clientY };
              const pos = view.posAtCoords(coords);

              if (!pos) {
                globalDragHandle.style.opacity = '0';
                return false;
              }

              try {
                const $pos = view.state.doc.resolve(pos.pos);
                let node = $pos.nodeAfter;
                let nodePos = pos.pos;

                // ✅ FIX: Détecter les listItem individuels au lieu de la liste entière
                // Remonter dans l'arbre pour trouver le bon niveau de bloc
                if ($pos.depth > 0) {
                  // Si on est dans un listItem, utiliser le listItem comme bloc
                  const parentNode = $pos.node($pos.depth);
                  if (parentNode.type.name === 'listItem') {
                    node = parentNode;
                    nodePos = $pos.before($pos.depth);
                  } else {
                  node = $pos.node();
                  nodePos = $pos.before();
                  }
                }

                if (node && (node.isBlock || node.type.name === 'listItem')) {
                  const domNode = view.nodeDOM(nodePos);
                  
                  if (domNode && domNode instanceof HTMLElement) {
                    // Trouver l'élément de premier niveau
                    let targetElement = domNode;
                    while (targetElement.parentElement && targetElement.parentElement !== view.dom) {
                      targetElement = targetElement.parentElement;
                    }

                    const rect = targetElement.getBoundingClientRect();
                    const editorRect = view.dom.getBoundingClientRect();

                    // ✅ Annuler le timeout de hide quand on affiche les handles
                    if (hideTimeout) {
                      clearTimeout(hideTimeout);
                      hideTimeout = null;
                    }

                    // Positionner le container (+ à gauche du drag handle)
                    globalDragHandle.style.left = `${rect.left - editorRect.left + HANDLE_LEFT_OFFSET}px`;
                    globalDragHandle.style.top = `${rect.top - editorRect.top + HANDLE_TOP_OFFSET}px`;
                    globalDragHandle.style.opacity = '1';
                    
                    // Utiliser posAtDOM pour la position exacte
                    let blockStartPos = view.posAtDOM(targetElement, 0);
                    
                    const $check = view.state.doc.resolve(blockStartPos);
                    if ($check.depth > 1) {
                      blockStartPos = $check.before(1);
                    }
                    
                    globalDragHandle.setAttribute('data-node-pos', blockStartPos.toString());

                    if (options.onNodeChange) {
                      options.onNodeChange({
                        node,
                        pos: nodePos,
                        editor: view.state,
                      });
                    }
                  }
                }
              } catch (error) {
                globalDragHandle.style.opacity = '0';
              }

              return false;
            },

            mouseleave: (view: EditorView, event: MouseEvent) => {
              if (!globalDragHandle) return false;
              
              const relatedTarget = event.relatedTarget as HTMLElement;
              
              // ✅ Si la souris entre dans les handles, ne pas cacher
              if (relatedTarget && (relatedTarget === globalDragHandle || globalDragHandle.contains(relatedTarget))) {
                return false;
              }

              // ✅ Délai avant de cacher (laisse le temps d'aller vers les handles)
              if (hideTimeout) {
                clearTimeout(hideTimeout);
              }
              
              hideTimeout = setTimeout(() => {
                if (globalDragHandle) {
              globalDragHandle.style.opacity = '0';
                }
              }, HIDE_DELAY_EDITOR);
              
              return false;
            },
          },
        },
      }),
    ];
  },
});

export default NotionDragHandleExtension;
