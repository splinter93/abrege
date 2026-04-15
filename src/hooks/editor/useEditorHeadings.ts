/**
 * useEditorHeadings - Hook pour extraire les headings de la TOC
 * Extrait de Editor.tsx pour respecter la limite de 300 lignes
 */

import { useMemo } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { logger, LogCategory } from '@/utils/logger';
import { hashString, getEditorMarkdown } from '@/utils/editorHelpers';
import { unescapeHtmlEntities } from '@/utils/markdownSanitizer.client';

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
  
  // Créer un hash du contenu pour éviter les re-calculs fréquents.
  // En mode readonly, le doc TipTap est vide → on hash directement `content` (markdown du store).
  const contentHash = useMemo(() => {
    const markdown = (editor ? getEditorMarkdown(editor) : null) || content || '';
    return hashString(markdown);
  }, [editor, content, forceTOCUpdate]);

  // Build headings for TOC - DIRECTEMENT depuis l'éditeur Tiptap (optimisé)
  const headings = useMemo(() => {
    // PRIORITÉ 1 : Éditeur Tiptap (si disponible ET contient du contenu)
    // ⚠️ En mode readonly (page publique), le contenu n'est pas injecté dans TipTap ;
    //    on ne retourne le résultat TipTap que s'il contient au moins un heading,
    //    sinon on tombe sur le fallback markdown.
    if (editor) {
      try {
        const doc = editor.state.doc;
        const items: Heading[] = [];
        
        doc.descendants((node) => {
          if (node.type.name === 'heading') {
            const level = node.attrs.level;
            const text = node.textContent;
            
            if (level >= 2 && level <= 3 && text.trim()) {
              const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              items.push({ id, text: text.trim(), level });
            }
          }
        });
        
        // Si TipTap a des headings, les utiliser (mode édition normal)
        if (items.length > 0) {
          return items;
        }
        // Sinon tomber sur le fallback markdown (mode readonly : doc vide car contenu non injecté)
      } catch (error) {
        logger.error(LogCategory.EDITOR, 'Erreur lors de l\'extraction des headings:', error);
      }
    }
    
    // PRIORITÉ 2 : Fallback markdown brut (readonly ou TipTap vide)
    // On déséchappe les entités HTML (&#039; → ') pour les notes dont le contenu
    // a été échappé par le sanitizer serveur avant de l'afficher dans la TOC.
    if (content && content.trim()) {
      const unescaped = unescapeHtmlEntities(content);
      const markdownLines = unescaped.split('\n');
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

