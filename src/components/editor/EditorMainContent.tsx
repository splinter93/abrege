/**
 * EditorMainContent - Rendu du contenu principal de l'éditeur
 * Extrait de Editor.tsx pour respecter la limite de 300 lignes
 */

import React, { useEffect } from 'react';
import { EditorContent as TiptapEditorContent } from '@tiptap/react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import FloatingMenuNotion from './floating-menu-notion';
import EditorContent from './EditorContent';
import TableControls from './TableControls';
import EditorSlashMenu, { type EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import type { SlashCommand } from '@/types/editor';
import { initializeMermaid } from '@/services/mermaid/mermaidConfig';
import { normalizeMermaidContent } from '@/components/chat/mermaidService';
import { openMermaidModal } from '@/components/mermaid/MermaidModal';
import { NoteEmbedHydrator } from './NoteEmbedHydrator';

interface EditorMainContentProps {
  isReadonly: boolean;
  editor: TiptapEditor | null;
  html: string;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  slashMenuRef: React.RefObject<EditorSlashMenuHandle | null>;
  slashLang: 'fr' | 'en';
  onOpenImageMenu: () => void;
  onSlashInsert: (cmd: SlashCommand) => void;
  // Props pour contexte enrichi Ask AI
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  noteSlug?: string;
  classeurId?: string;
  classeurName?: string;
  // ✅ FIX React 18: Attendre que le contenu initial soit chargé
  isContentReady?: boolean;
}

const EditorMainContent: React.FC<EditorMainContentProps> = ({
  isReadonly,
  editor,
  html,
  editorContainerRef,
  slashMenuRef,
  slashLang,
  onOpenImageMenu,
  onSlashInsert,
  noteId,
  noteTitle,
  noteContent,
  noteSlug,
  classeurId,
  classeurName,
  isContentReady = true, // Default true pour compatibilité
}) => {
  // ✅ Ref pour tracker le hash du dernier HTML injecté et éviter les réinjections inutiles
  const lastHtmlHashRef = React.useRef<string>('');
  
  // Calculer un hash simple du HTML pour détecter les vrais changements
  const htmlHash = React.useMemo(() => {
    if (!html) return '';
    // Hash simple basé sur la longueur et quelques caractères clés
    return `${html.length}-${html.substring(0, 100).replace(/\s/g, '')}`;
  }, [html]);
  
  // Attacher les event listeners et rendre mermaid en readonly
  useEffect(() => {
    // ✅ FIX: Vérifier isReadonly ET que html existe (pour preview et pages publiques)
    if (!isReadonly || !editorContainerRef.current) return;
    
    // ✅ CRITIQUE: Attendre que le HTML soit disponible (important pour pages publiques)
    if (!html || html.trim() === '' || html === '<div class="markdown-loading">Chargement...</div>') {
      // HTML pas encore prêt, réessayer plus tard
      return; // Le useEffect se re-déclenchera quand html changera (dépendance)
    }
    
    // ✅ Vérifier que le HTML contient bien des blocs Mermaid avant de chercher dans le DOM
    const htmlContainsMermaid = html.includes('u-block--mermaid') && html.includes('data-mermaid="true"');
    if (!htmlContainsMermaid) {
      // Pas de blocs Mermaid dans le HTML, rien à faire
      return;
    }
    
    const container = editorContainerRef.current;
    
    // ✅ DEBUG: Logger pour diagnostiquer les pages publiques
    if (process.env.NODE_ENV === 'development') {
      console.log('[EditorMainContent] useEffect déclenché', {
        isReadonly,
        hasHtml: !!html,
        htmlLength: html?.length || 0,
        htmlHash,
        lastHash: lastHtmlHashRef.current,
        hasContainer: !!container,
        htmlContainsMermaid: html?.includes('u-block--mermaid') || false,
        containerHTML: container?.innerHTML?.substring(0, 200) || 'vide'
      });
    }
    
    // ✅ Définir les fonctions AVANT de les utiliser
    // Rendre les diagrammes Mermaid
    const renderMermaidBlocks = async (retryCount = 0): Promise<void> => {
      // ✅ FIX: Attendre que le DOM soit mis à jour après l'injection du HTML
      // Double requestAnimationFrame pour s'assurer que React a complètement injecté le HTML
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      
      // ✅ Vérifier que le conteneur existe toujours
      if (!container) return;
      
      const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      
      // ✅ Si aucun bloc trouvé et qu'on n'a pas encore réessayé, réessayer plusieurs fois
      if (mermaidBlocks.length === 0 && retryCount < 3) {
        setTimeout(() => {
          renderMermaidBlocks(retryCount + 1);
        }, 150 * (retryCount + 1)); // Délai progressif : 150ms, 300ms, 450ms
        return;
      }
      
      // Si toujours aucun bloc après retries, retourner silencieusement
      if (mermaidBlocks.length === 0) {
        return;
      }
      
      for (const block of mermaidBlocks) {
        const body = block.querySelector('.u-block__body') as HTMLElement;
        if (!body) continue;
        
        // ✅ Récupérer le contenu Mermaid depuis data-mermaid-content ou le code caché
        // IMPORTANT : Toujours récupérer depuis l'attribut data car le HTML peut être réinjecté
        const mermaidContent = body?.dataset?.mermaidContent || body?.querySelector('pre code')?.textContent || '';
        
        if (!mermaidContent) continue;
        
        // ✅ Vérifier si le bloc a déjà été rendu (éviter double rendu)
        const existingSvg = body.querySelector('.mermaid-svg-container');
        const hasValidSvg = existingSvg && existingSvg.innerHTML.trim() !== '' && existingSvg.querySelector('svg');
        
        // ✅ Si le SVG existe ET contient du contenu valide, skip
        if (hasValidSvg) {
          continue; // Déjà rendu et valide
        }
        
        // ✅ IMPORTANT : Si le body est vide ou ne contient que le <pre style="display:none">, 
        // c'est qu'il a été vidé par dangerouslySetInnerHTML → il faut re-rendre
        const bodyContent = body.innerHTML.trim();
        const hasOnlyHiddenPre = bodyContent.includes('<pre style="display:none">') && !hasValidSvg;
        
        // ✅ Si le body est vide ou ne contient que le pre caché, le vider complètement avant de re-rendre
        if (bodyContent === '' || hasOnlyHiddenPre || (!hasValidSvg && bodyContent)) {
          body.innerHTML = '';
        }
        
          try {
            // ✅ Forcer réinitialisation avec htmlLabels: false
            await initializeMermaid({ 
              flowchart: { 
                htmlLabels: false
              } as any
            });
            const mermaid = await import('mermaid');
            
            const normalizedContent = normalizeMermaidContent(mermaidContent);
            const id = `mermaid-readonly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const result = await mermaid.default.render(id, normalizedContent);
            
            if (result?.svg) {
              let svg = result.svg;
              
              // ✅ Laisser Mermaid gérer le layout - pas de transformation SVG
              
              const svgContainer = document.createElement('div');
              svgContainer.className = 'mermaid-svg-container';
              svgContainer.innerHTML = svg;
              body.innerHTML = '';
              body.appendChild(svgContainer);
            }
          } catch (error) {
            // En cas d'erreur, afficher le code brut
            body.innerHTML = `<pre><code>${mermaidContent}</code></pre>`;
        }
      }
    };
    
    // ✅ Attendre que le DOM soit mis à jour avant d'attacher les listeners
    const setupEventListeners = () => {
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
    };
    
    // ✅ Si le HTML n'a pas vraiment changé (même hash), juste vérifier les blocs Mermaid
    if (htmlHash === lastHtmlHashRef.current && lastHtmlHashRef.current !== '') {
      // HTML identique, vérifier si les blocs Mermaid sont toujours rendus
      if (container) {
        const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
        if (mermaidBlocks.length > 0) {
          const needsRendering = Array.from(mermaidBlocks).some(block => {
            const body = block.querySelector('.u-block__body') as HTMLElement;
            if (!body) return true;
            const svgContainer = body.querySelector('.mermaid-svg-container');
            const hasValidSvg = svgContainer && svgContainer.innerHTML.trim() !== '' && svgContainer.querySelector('svg');
            return !hasValidSvg;
          });
          
          // Si des blocs sont vides, les re-rendre sans réinjecter le HTML
          if (needsRendering) {
            // ✅ Appeler directement renderMermaidBlocks (maintenant définie avant)
            setTimeout(() => {
              renderMermaidBlocks(0).then(() => {
                setupEventListeners();
              }).catch(() => {
                setupEventListeners();
              });
            }, 100);
          }
        }
      }
      // Ne pas réinjecter le HTML si identique
      return;
    }
    
    // ✅ Mettre à jour la référence du hash
    lastHtmlHashRef.current = htmlHash;
    
    // ✅ Fonction pour vérifier et rendre les blocs Mermaid
    const checkAndRenderMermaid = async (retryCount = 0): Promise<void> => {
      // Attendre un peu pour que le HTML soit injecté (important après changement de visibilité ou chargement page publique)
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      
      if (!container) return;
      
      // Vérifier si des blocs existent déjà (cas retour sur page ou changement de visibilité)
      const existingBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      
      // ✅ DEBUG: Logger pour diagnostiquer les pages publiques
      if (process.env.NODE_ENV === 'development' && retryCount === 0) {
        console.log('[EditorMainContent] checkAndRenderMermaid', {
          retryCount,
          blocksFound: existingBlocks.length,
          containerExists: !!container,
          hasHtml: !!html,
          htmlLength: html?.length || 0,
          containerHTML: container.innerHTML.substring(0, 500)
        });
      }
      
      // ✅ Si aucun bloc trouvé et qu'on n'a pas encore réessayé plusieurs fois, réessayer (augmenté pour pages publiques)
      if (existingBlocks.length === 0 && retryCount < 10) {
        setTimeout(() => {
          checkAndRenderMermaid(retryCount + 1);
        }, 300 * (retryCount + 1)); // Délai progressif plus long : 300ms, 600ms, 900ms, etc. (pour pages publiques lentes)
        return;
      }
      
      if (existingBlocks.length > 0) {
        // ✅ Toujours vérifier si les blocs ont besoin d'être rendus (car HTML peut avoir été réinjecté)
        const needsRendering = Array.from(existingBlocks).some(block => {
          const body = block.querySelector('.u-block__body') as HTMLElement;
          if (!body) return true;
          
          const svgContainer = body.querySelector('.mermaid-svg-container');
          const hasValidSvg = svgContainer && svgContainer.innerHTML.trim() !== '' && svgContainer.querySelector('svg');
          
          // ✅ Vérifier si le bloc est vide, n'a pas de SVG valide, ou ne contient que le <pre style="display:none">
          const bodyContent = body.innerHTML.trim();
          const hasOnlyHiddenPre = bodyContent.includes('<pre style="display:none">') && !hasValidSvg;
          const mermaidContent = body?.dataset?.mermaidContent || body?.querySelector('pre code')?.textContent || '';
          
          // ✅ DEBUG: Logger si bloc vide détecté
          if (process.env.NODE_ENV === 'development' && !hasValidSvg) {
            console.log('[EditorMainContent] Bloc Mermaid vide détecté', {
              hasBody: !!body,
              bodyContent: bodyContent.substring(0, 100),
              hasMermaidContent: !!mermaidContent,
              mermaidContentLength: mermaidContent.length,
              hasOnlyHiddenPre
            });
          }
          
          return !hasValidSvg || bodyContent === '' || hasOnlyHiddenPre;
        });
        
        if (needsRendering) {
          // ✅ Forcer le re-rendu même si certains blocs semblent déjà rendus
          await renderMermaidBlocks();
          setTimeout(() => {
            setupEventListeners();
          }, 50);
        } else {
          // Les blocs sont déjà rendus, juste attacher les listeners
          setupEventListeners();
        }
      }
    };
    
    // ✅ Exécuter immédiatement pour vérifier les blocs existants
    checkAndRenderMermaid();
    
    // ✅ Utiliser MutationObserver pour détecter quand de nouveaux blocs sont ajoutés
    const observer = new MutationObserver((mutations) => {
      // Vérifier si des blocs Mermaid ont été ajoutés
      const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      if (mermaidBlocks.length > 0) {
        // Vérifier si certains blocs ne sont pas encore rendus
        const needsRendering = Array.from(mermaidBlocks).some(block => {
          const body = block.querySelector('.u-block__body') as HTMLElement;
          return body && !body.querySelector('.mermaid-svg-container');
        });
        
        if (needsRendering) {
          observer.disconnect();
          renderMermaidBlocks().then(() => {
            setTimeout(() => {
              setupEventListeners();
            }, 50);
          }).catch(() => {
            setupEventListeners();
          });
        }
      }
    });
    
    // Observer les changements dans le conteneur
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    
    // ✅ Fallback : exécuter aussi après plusieurs délais pour gérer les cas où le HTML est injecté plus tard
    const timeoutId1 = setTimeout(() => {
      checkAndRenderMermaid(0);
    }, 200);
    
    const timeoutId2 = setTimeout(() => {
      checkAndRenderMermaid(2);
    }, 1000);
    
    const timeoutId3 = setTimeout(() => {
      observer.disconnect();
      checkAndRenderMermaid(4);
    }, 3000);
    
    // ✅ Vérification périodique pour les cas où les blocs sont vidés après le rendu initial (ex: après 3 secondes)
    const periodicCheck = setInterval(() => {
      if (!container) {
        clearInterval(periodicCheck);
        return;
      }
      const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      if (mermaidBlocks.length > 0) {
        const needsRendering = Array.from(mermaidBlocks).some(block => {
          const body = block.querySelector('.u-block__body') as HTMLElement;
          if (!body) return false;
          const svgContainer = body.querySelector('.mermaid-svg-container');
          const hasValidSvg = svgContainer && svgContainer.innerHTML.trim() !== '' && svgContainer.querySelector('svg');
          return !hasValidSvg;
        });
        if (needsRendering) {
          // ✅ Appeler renderMermaidBlocks directement pour re-rendre les blocs vides
          renderMermaidBlocks(0).then(() => {
            setupEventListeners();
          }).catch(() => {
            setupEventListeners();
          });
        }
      }
    }, 2000); // Vérifier toutes les 2 secondes
    
    // ✅ Nettoyage au démontage
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearInterval(periodicCheck);
    };
    
  }, [isReadonly, html, editorContainerRef, noteId]); // ✅ Dépendances : se déclenche quand isReadonly change (preview ↔ édition) ou html change

  return (
    <EditorContent>
      <div className="tiptap-editor-container" ref={editorContainerRef} style={{ position: 'relative' }}>
        {!isReadonly && (
          <>
            {/* Floating menu Notion-like avec contexte enrichi */}
            <FloatingMenuNotion 
              editor={editor}
              noteId={noteId}
              noteTitle={noteTitle}
              noteContent={noteContent}
              noteSlug={noteSlug}
              classeurId={classeurId}
              classeurName={classeurName}
            />
            
            {/* Contenu Tiptap */}
            {/* ✅ TOUJOURS rendu pour que les drag handles fonctionnent */}
            <TiptapEditorContent editor={editor} />
            
            {/* ✅ Loading géré par EditorSyncManager - Pas besoin d'overlay visible */}
            
            {/* Table controls */}
            <TableControls 
              editor={editor} 
              containerRef={editorContainerRef as React.RefObject<HTMLElement>} 
            />
            
            {/* Slash commands menu */}
            <EditorSlashMenu
              ref={slashMenuRef}
              editor={editor}
              lang={slashLang}
              onOpenImageMenu={onOpenImageMenu}
              onInsert={onSlashInsert}
            />
          </>
        )}
        {isReadonly && (
          <>
            <div 
              ref={editorContainerRef as React.RefObject<HTMLDivElement>}
              className="markdown-body editor-content-wrapper" 
              key={`html-${htmlHash}`} // ✅ Clé basée sur le hash pour éviter réinjections inutiles
              dangerouslySetInnerHTML={{ __html: html }} 
            />
            {/* ✅ Hydrater les note embeds en mode preview */}
            <NoteEmbedHydrator
              containerRef={editorContainerRef as React.RefObject<HTMLElement>}
              htmlContent={html}
            />
          </>
        )}
      </div>
    </EditorContent>
  );
};

export default EditorMainContent;

