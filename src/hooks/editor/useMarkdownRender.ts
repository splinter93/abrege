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
 * ✅ AMÉLIORATION: Fonction pour détecter si on est dans un tableau Markdown
 * Optimisée pour le streaming à haute vitesse et la détection des tableaux partiels
 * @param content Le contenu à analyser
 * @returns true si on est dans un tableau
 */
function isInTable(content: string): boolean {
  const lines = content.split('\n');
  let inTable = false;
  let hasHeader = false;
  let hasSeparator = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Détecter le début d'un tableau (ligne avec des pipes)
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        hasHeader = true;
      }
    }
    // Détecter la ligne de séparation (|----| ou |:---|)
    else if (inTable && trimmedLine.match(/^\|[\s\-:]+\|$/)) {
      hasSeparator = true;
    }
    // Détecter la fin d'un tableau (ligne vide ou contenu non-tableau)
    else if (inTable && (trimmedLine === '' || (!trimmedLine.startsWith('|') && trimmedLine !== ''))) {
      inTable = false;
      hasHeader = false;
      hasSeparator = false;
    }
  }
  
  // ✅ NOUVEAU: Détection plus intelligente des tableaux partiels
  // Un tableau est considéré comme "dans un tableau" si :
  // 1. Il a au moins une ligne d'en-tête
  // 2. Il a potentiellement une ligne de séparation
  // 3. Il n'est pas explicitement terminé
  return inTable || (hasHeader && !hasSeparator);
}

/**
 * ✅ AMÉLIORATION: Fonction pour nettoyer le contenu Markdown partiel
 * Optimisée pour le streaming à haute vitesse (800 tokens/sec)
 * @param content Le contenu à nettoyer
 * @returns Le contenu nettoyé
 */
function cleanPartialMarkdown(content: string): string {
  if (!content) return '';
  
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let inTable = false;
  let tableStartIndex = -1;
  let tableColumnCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Détecter le début d'un tableau
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableStartIndex = i;
        // Compter le nombre de colonnes pour valider la structure
        tableColumnCount = (trimmedLine.match(/\|/g) || []).length - 1;
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
  
  // ✅ NOUVEAU: Gestion intelligente des tableaux incomplets
  if (inTable && tableStartIndex !== -1) {
    // Si on est dans un tableau et que le contenu se termine, compléter intelligemment
    const lastLine = lines[lines.length - 1];
    const lastLineTrimmed = lastLine.trim();
    
    // Si la dernière ligne est incomplète (pas de | à la fin), la compléter
    if (lastLineTrimmed !== '' && !lastLineTrimmed.endsWith('|')) {
      // Ajouter des cellules vides pour compléter la ligne
      const currentColumns = (lastLineTrimmed.match(/\|/g) || []).length;
      const missingColumns = Math.max(0, tableColumnCount - currentColumns);
      
      if (missingColumns > 0) {
        const completedLine = lastLine + '|'.repeat(missingColumns);
        cleanedLines[cleanedLines.length - 1] = completedLine;
      }
    }
    
    // Ajouter une ligne vide après le tableau pour le terminer proprement
    cleanedLines.push('');
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
      
      // ✅ AMÉLIORATION: Gestion intelligente pour les tableaux partiels
      const inTable = isInTable(cleanedContent);
      
      let contentToRender = cleanedContent;
      
      // Si on est dans un tableau partiel, essayer de le compléter intelligemment
      if (inTable) {
        const lines = cleanedContent.split('\n');
        const lastLine = lines[lines.length - 1];
        const lastLineTrimmed = lastLine.trim();
        
        // ✅ NOUVEAU: Logique de complétion plus sophistiquée
        if (lastLineTrimmed !== '' && lastLineTrimmed.startsWith('|')) {
          // Compter les colonnes dans la première ligne du tableau
          const firstTableLine = lines.find(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
          if (firstTableLine) {
            const expectedColumns = (firstTableLine.match(/\|/g) || []).length - 1;
            const currentColumns = (lastLineTrimmed.match(/\|/g) || []).length;
            
            // Si la dernière ligne a moins de colonnes que prévu, la compléter
            if (currentColumns < expectedColumns) {
              const missingColumns = expectedColumns - currentColumns;
              contentToRender = cleanedContent + '|'.repeat(missingColumns);
              
              // Ajouter une ligne vide pour terminer le tableau proprement
              contentToRender += '\n';
            }
          }
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