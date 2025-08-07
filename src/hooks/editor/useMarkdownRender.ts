import { useMemo, useRef } from 'react';
import { createMarkdownIt } from '@/utils/markdownItConfig';
import { simpleLogger as logger } from '@/utils/logger';

export interface UseMarkdownRenderProps {
  content: string;
}

export interface UseMarkdownRenderReturn {
  html: string;
  isRendering: boolean;
  md: any;
}

/**
 * Fonction pour détecter si on est dans un tableau Markdown
 * @param content Le contenu à analyser
 * @returns true si on est dans un tableau
 */
function isInTable(content: string): boolean {
  const lines = content.split('\n');
  let inTable = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Détecter le début d'un tableau
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      inTable = true;
    }
    // Détecter la ligne de séparation
    else if (inTable && trimmedLine.match(/^\|[\s\-:]+\|$/)) {
      inTable = true;
    }
    // Détecter la fin d'un tableau (ligne vide ou autre contenu)
    else if (inTable && trimmedLine === '') {
      inTable = false;
    }
    // Si on est dans un tableau et qu'on a une ligne qui ne commence pas par |
    else if (inTable && trimmedLine !== '' && !trimmedLine.startsWith('|')) {
      inTable = false;
    }
  }
  
  return inTable;
}

/**
 * Fonction pour nettoyer le contenu Markdown partiel
 * @param content Le contenu à nettoyer
 * @returns Le contenu nettoyé
 */
function cleanPartialMarkdown(content: string): string {
  if (!content) return '';
  
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let inTable = false;
  let tableStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Détecter le début d'un tableau
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableStartIndex = i;
      }
      cleanedLines.push(line);
    }
    // Détecter la ligne de séparation
    else if (inTable && trimmedLine.match(/^\|[\s\-:]+\|$/)) {
      cleanedLines.push(line);
    }
    // Détecter la fin d'un tableau
    else if (inTable && (trimmedLine === '' || (!trimmedLine.startsWith('|') && trimmedLine !== ''))) {
      inTable = false;
      // S'assurer que le tableau se termine proprement
      if (trimmedLine === '') {
        cleanedLines.push(line);
      } else {
        // Ajouter une ligne vide avant le contenu suivant
        cleanedLines.push('');
        cleanedLines.push(line);
      }
    }
    // Contenu normal
    else {
      cleanedLines.push(line);
    }
  }
  
  // S'assurer qu'un tableau ouvert se termine proprement
  if (inTable && tableStartIndex !== -1) {
    // Chercher la dernière ligne du tableau
    for (let i = cleanedLines.length - 1; i >= tableStartIndex; i--) {
      if (cleanedLines[i].trim() !== '') {
        // Ajouter une ligne vide après le tableau
        cleanedLines.splice(i + 1, 0, '');
        break;
      }
    }
  }
  
  return cleanedLines.join('\n');
}

/**
 * Hook de rendu Markdown, fiabilisé pour le streaming.
 * La clé est de ne jamais planter sur du markdown partiel et de forcer
 * le rendu à chaque changement de contenu.
 */
export const useMarkdownRender = ({
  content,
}: UseMarkdownRenderProps): UseMarkdownRenderReturn => {
  const mdRef = useRef<ReturnType<typeof createMarkdownIt> | null>(null);

  // Initialisation paresseuse et unique de markdown-it
  if (!mdRef.current) {
    mdRef.current = createMarkdownIt();
  }

  // Utiliser useMemo pour éviter les re-renders inutiles
  const { html, isRendering } = useMemo(() => {
    try {
      // 🔧 AMÉLIORATION: Nettoyer le contenu partiel avant le rendu
      const cleanedContent = cleanPartialMarkdown(content);
      
      // 🔧 AMÉLIORATION: Gestion spéciale pour les tableaux partiels
      const inTable = isInTable(cleanedContent);
      
      let contentToRender = cleanedContent;
      
      // Si on est dans un tableau partiel, essayer de le compléter
      if (inTable) {
        const lines = cleanedContent.split('\n');
        const lastLine = lines[lines.length - 1];
        
        // Si la dernière ligne est incomplète (pas de | à la fin), l'ajouter
        if (lastLine.trim() !== '' && !lastLine.trim().endsWith('|')) {
          contentToRender = cleanedContent + '|';
        }
      }
      
      const rendered = mdRef.current!.render(contentToRender);
      return {
        html: rendered,
        isRendering: false
      };
    } catch (error) {
      logger.error('Erreur de rendu Markdown (partiel, attendu):', error);
      // En cas d'erreur (ex: markdown partiel), on affiche le contenu brut
      // La prochaine mise à jour corrigera probablement le rendu.
      return {
        html: content,
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