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
  classeurName
}) => {
  // Attacher les event listeners et rendre mermaid en readonly
  useEffect(() => {
    if (!isReadonly || !editorContainerRef.current) return;
    
    const container = editorContainerRef.current;
    
    // Rendre les diagrammes Mermaid
    const renderMermaidBlocks = async () => {
      const mermaidBlocks = container.querySelectorAll('.u-block--mermaid[data-mermaid="true"]');
      
      for (const block of mermaidBlocks) {
        const body = block.querySelector('.u-block__body') as HTMLElement;
        const mermaidContent = body?.dataset?.mermaidContent || body?.querySelector('pre code')?.textContent || '';
        
        if (body && mermaidContent) {
          try {
            // ✅ Forcer réinitialisation avec htmlLabels: false
            await initializeMermaid({ 
              flowchart: { 
                htmlLabels: false,
                wrap: true,
                wrapPadding: 20
              } 
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
      }
    };
    
    renderMermaidBlocks();
    
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
    
  }, [isReadonly, html, editorContainerRef]);

  return (
    <EditorContent>
      <div className="tiptap-editor-container" ref={editorContainerRef}>
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
            <TiptapEditorContent editor={editor} />
            
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
          <div className="markdown-body editor-content-wrapper" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </EditorContent>
  );
};

export default EditorMainContent;

