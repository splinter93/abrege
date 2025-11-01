/**
 * useEditorHeadings - Hook pour extraire les headings de la TOC
 * Extrait de Editor.tsx pour respecter la limite de 300 lignes
 */

import { useMemo } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { logger, LogCategory } from '@/utils/logger';
import { hashString, getEditorMarkdown } from '@/utils/editorHelpers';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface UseEditorHeadingsOptions {
  editor: TiptapEditor | null;
  content: string;
  forceTOCUpdate: number;
}

export function useEditorHeadings({
  editor,
  content,
  forceTOCUpdate
}: UseEditorHeadingsOptions): Heading[] {
  
  // Créer un hash du contenu pour éviter les re-calculs fréquents
  const contentHash = useMemo(() => {
    if (!editor) return 0;
    const markdown = getEditorMarkdown(editor) || content || '';
    return hashString(markdown);
  }, [editor, content, forceTOCUpdate]);

  // Build headings for TOC - DIRECTEMENT depuis l'éditeur Tiptap (optimisé)
  const headings = useMemo(() => {
    // PRIORITÉ 1 : Éditeur Tiptap (si disponible)
    if (editor) {
      try {
        const doc = editor.state.doc;
        const items: Heading[] = [];
        
        doc.descendants((node, pos) => {
          if (node.type.name === 'heading') {
            const level = node.attrs.level;
            const text = node.textContent;
            
            if (level >= 2 && level <= 3 && text.trim()) {
              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              items.push({ id, text: text.trim(), level });
            }
          }
        });
        
        return items;
      } catch (error) {
        logger.error(LogCategory.EDITOR, 'Erreur lors de l\'extraction des headings:', error);
      }
    }
    
    // PRIORITÉ 2 : Fallback markdown brut
    if (content && content.trim()) {
      const markdownLines = content.split('\n');
      const fallbackItems: Heading[] = [];
      
      markdownLines.forEach((line) => {
        const match = line.match(/^(#{1,6})\s+(.+)/);
        if (match) {
          const level = match[1].length;
          const title = match[2].trim();
          const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          
          if (level >= 2 && level <= 3) {
            fallbackItems.push({ id, text: title, level });
          }
        }
      });
      
      return fallbackItems;
    }
    
    return [];
  }, [editor, contentHash, content]);

  return headings;
}

