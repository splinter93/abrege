import { useMemo, useRef } from 'react';
import { createMarkdownIt } from '@/utils/markdownItConfig';
import { simpleLogger as logger } from '@/utils/logger';
import type MarkdownIt from 'markdown-it';

export interface UseMarkdownRenderProps {
  content: string;
}

export interface UseMarkdownRenderReturn {
  html: string;
  isRendering: boolean;
  md: MarkdownIt | null;
}

/**
 * Fonction pour nettoyer et valider le contenu Markdown
 * Optimisée pour le rendu des tableaux et autres éléments
 */
function cleanMarkdownContent(content: string): string {
  if (!content) return '';
  
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let inTable = false;
  let tableColumnCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Détecter le début d'un tableau
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        // Compter le nombre de colonnes
        tableColumnCount = (trimmedLine.match(/\|/g) || []).length - 1;
      }
      cleanedLines.push(line);
    }
    // Détecter la ligne de séparation
    else if (inTable && trimmedLine.match(/^\|[\s\-:]+\|$/)) {
      cleanedLines.push(line);
    }
    // Détecter la fin d'un tableau
    else if (inTable && (trimmedLine === '' || !trimmedLine.startsWith('|'))) {
      inTable = false;
      if (trimmedLine === '') {
        cleanedLines.push(line);
      } else {
        cleanedLines.push('');
        cleanedLines.push(line);
      }
    }
    // Contenu normal
    else {
      cleanedLines.push(line);
    }
  }
  
  // Compléter les tableaux incomplets
  if (inTable) {
    const lastLine = lines[lines.length - 1];
    const lastLineTrimmed = lastLine.trim();
    
    if (lastLineTrimmed !== '' && !lastLineTrimmed.endsWith('|')) {
      const currentColumns = (lastLineTrimmed.match(/\|/g) || []).length;
      const missingColumns = Math.max(0, tableColumnCount - currentColumns);
      
      if (missingColumns > 0) {
        const completedLine = lastLine + '|'.repeat(missingColumns);
        cleanedLines[cleanedLines.length - 1] = completedLine;
      }
    }
    
    // Terminer le tableau proprement
    cleanedLines.push('');
  }
  
  return cleanedLines.join('\n');
}

/**
 * Hook de rendu Markdown optimisé
 * Gestion améliorée des tableaux et performance optimisée
 */
export const useMarkdownRender = ({
  content,
}: UseMarkdownRenderProps): UseMarkdownRenderReturn => {
  const mdRef = useRef<ReturnType<typeof createMarkdownIt> | null>(null);

  // Initialisation paresseuse de markdown-it
  if (!mdRef.current) {
    mdRef.current = createMarkdownIt();
  }

  // Rendu optimisé avec useMemo
  const { html, isRendering } = useMemo(() => {
    try {
      // Nettoyer le contenu
      const cleanedContent = cleanMarkdownContent(content);
      
      // Rendu avec markdown-it
      const rendered = mdRef.current!.render(cleanedContent);
      
      return {
        html: rendered,
        isRendering: false
      };
    } catch (error) {
      logger.error('Erreur de rendu Markdown:', error);
      
      // Fallback : afficher le contenu brut en cas d'erreur
      return {
        html: `<pre class="markdown-error">${content}</pre>`,
        isRendering: false
      };
    }
  }, [content]);

  return {
    html,
    isRendering,
    md: mdRef.current
  };
}; 