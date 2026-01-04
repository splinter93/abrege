/**
 * Utilitaires pour les sélections de texte du canvas
 * Fonctions pures pour créer et émettre des événements de sélection
 * @module utils/canvasSelectionUtils
 */

import type { CanvasSelection } from '@/types/canvasSelection';
import { logger, LogCategory } from '@/utils/logger';
import type { Editor } from '@tiptap/react';

/**
 * Constante pour la longueur minimale d'une sélection valide
 */
const MIN_SELECTION_LENGTH = 3;

/**
 * Valide qu'une sélection de texte est valide (minimum 3 caractères)
 * 
 * @param text - Texte à valider
 * @returns true si la sélection est valide, false sinon
 */
export function isValidCanvasSelection(text: string | null | undefined): boolean {
  return !!(text && text.trim().length >= MIN_SELECTION_LENGTH);
}

/**
 * Crée un objet CanvasSelection à partir des paramètres
 * 
 * @param text - Texte sélectionné
 * @param noteId - ID de la note (optionnel)
 * @param noteSlug - Slug de la note (optionnel)
 * @param noteTitle - Titre de la note (optionnel)
 * @param startPos - Position de début (optionnel)
 * @param endPos - Position de fin (optionnel)
 * @returns Objet CanvasSelection
 */
export function createCanvasSelection(
  text: string,
  noteId?: string,
  noteSlug?: string,
  noteTitle?: string,
  startPos?: number,
  endPos?: number
): CanvasSelection {
  // ✅ trim() supprime uniquement espaces/sauts de ligne en début/fin
  // Les sauts de ligne au milieu du texte sont préservés
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    noteId,
    noteSlug,
    noteTitle,
    startPos,
    endPos,
    timestamp: new Date().toISOString()
  };
}

/**
 * Émet un événement 'canvas-selection' avec la sélection
 * 
 * @param selection - Sélection à émettre
 * @returns true si l'événement a été émis, false sinon
 */
export function emitCanvasSelection(selection: CanvasSelection): boolean {
  if (!isValidCanvasSelection(selection.text)) {
    logger.warn(LogCategory.EDITOR, '[canvasSelectionUtils] Sélection trop courte, ignorée', {
      textLength: selection.text?.length || 0
    });
    return false;
  }

  try {
    const event = new CustomEvent<CanvasSelection>('canvas-selection', {
      detail: selection,
      bubbles: true
    });
    
    document.dispatchEvent(event);

    logger.debug(LogCategory.EDITOR, '[canvasSelectionUtils] ✅ Événement canvas-selection émis', {
      selectionId: selection.id,
      textLength: selection.text.length,
      textPreview: selection.text.substring(0, 50),
      noteId: selection.noteId,
      noteTitle: selection.noteTitle
    });

    return true;
  } catch (error) {
    logger.error(LogCategory.EDITOR, '[canvasSelectionUtils] ❌ Erreur lors de l\'émission de l\'événement', {
      error: error instanceof Error ? error.message : String(error),
      selectionId: selection.id
    });
    return false;
  }
}

/**
 * Extrait le texte d'une sélection en préservant les sauts de ligne
 * Utilise '\n' au lieu de ' ' pour préserver la structure du texte
 * 
 * @param editor - Instance de l'éditeur TipTap
 * @param from - Position de début de la sélection
 * @param to - Position de fin de la sélection
 * @returns Texte extrait avec sauts de ligne préservés
 */
export function extractSelectionText(editor: Editor, from: number, to: number): string {
  // ✅ Utiliser '\n' au lieu de ' ' pour préserver les sauts de ligne
  // Le troisième paramètre de textBetween est le séparateur pour les blocs
  return editor.state.doc.textBetween(from, to, '\n').trim();
}

/**
 * Type pour un nœud TipTap générique
 */
type TipTapNode = {
  type: string;
  content?: unknown[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<{ type: string }>;
};

/**
 * Convertit un nœud JSON TipTap en markdown
 * Gère les paragraphes, titres, code blocks, tableaux, listes, etc.
 */
function convertNodeToMarkdown(node: TipTapNode): string {
  const lines: string[] = [];

  if (node.type === 'paragraph') {
    const text = extractTextFromNode(node);
    if (text.trim()) {
      lines.push(text);
    }
  } else if (node.type === 'heading') {
    const level = (node.attrs?.level as number) || 1;
    const text = extractTextFromNode(node);
    lines.push('#'.repeat(level) + ' ' + text);
  } else if (node.type === 'codeBlock') {
    const code = extractTextFromNode(node);
    const language = (node.attrs?.language as string) || '';
    lines.push('```' + (language ? language : ''));
    lines.push(code);
    lines.push('```');
  } else if (node.type === 'table') {
    // ✅ Conversion tableau en markdown
    const tableMarkdown = convertTableToMarkdown(node as { type: string; content?: Array<{ type: string; content?: unknown[] }> });
    if (tableMarkdown) {
      lines.push(tableMarkdown);
    }
  } else if (node.type === 'bulletList' || node.type === 'orderedList') {
    const listMarkdown = convertListToMarkdown(node as { type: string; content?: Array<{ type: string; content?: unknown[] }> });
    if (listMarkdown) {
      lines.push(listMarkdown);
    }
  } else if (node.type === 'taskList') {
    const taskListMarkdown = convertTaskListToMarkdown(node as { type: string; content?: Array<{ type: string; attrs?: Record<string, unknown>; content?: unknown[] }> });
    if (taskListMarkdown) {
      lines.push(taskListMarkdown);
    }
  } else if (node.type === 'blockquote') {
    const text = extractTextFromNode(node);
    const quotedLines = text.split('\n');
    quotedLines.forEach(line => {
      if (line.trim()) {
        lines.push('> ' + line);
      }
    });
  } else if (node.content && Array.isArray(node.content)) {
    // Récursion pour les nœuds conteneurs
    node.content.forEach((child: unknown) => {
      const childMarkdown = convertNodeToMarkdown(child as TipTapNode);
      if (childMarkdown) {
        lines.push(childMarkdown);
      }
    });
  }

  return lines.join('\n');
}

/**
 * Extrait le texte d'un nœud avec ses marks (bold, italic, etc.)
 */
function extractTextFromNode(
  node: TipTapNode
): string {
  if (node.text) {
    let text = node.text;
    // Appliquer les marks (bold, italic, etc.)
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = `**${text}**`;
        if (mark.type === 'italic') text = `*${text}*`;
        if (mark.type === 'code') text = `\`${text}\``;
        if (mark.type === 'strike') text = `~~${text}~~`;
      }
    }
    return text;
  }
  
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((child: unknown) => 
      extractTextFromNode(child as TipTapNode)
    ).join('');
  }
  
  return '';
}

/**
 * Convertit un tableau TipTap en markdown
 */
function convertTableToMarkdown(
  tableNode: { type: string; content?: Array<{ type: string; content?: unknown[] }> }
): string {
  if (!tableNode.content || !Array.isArray(tableNode.content)) {
    return '';
  }

  const rows: string[][] = [];

  // Parcourir les lignes (tableRow)
  tableNode.content.forEach((rowNode: unknown) => {
    const row = rowNode as TipTapNode & { content?: unknown[] };
    if (row.type === 'tableRow' && row.content && Array.isArray(row.content)) {
      const cells: string[] = [];
      
      row.content.forEach((cellNode: unknown) => {
        const cell = cellNode as TipTapNode;
        if (cell.type === 'tableCell' || cell.type === 'tableHeader') {
          const cellText = extractTextFromNode(cell);
          // Nettoyer le texte (remplacer sauts de ligne par espaces dans les cellules)
          cells.push(cellText.replace(/\n/g, ' ').trim());
        }
      });
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
  });

  if (rows.length === 0) {
    return '';
  }

  // Construire le markdown du tableau
  const lines: string[] = [];
  
  // ✅ Protection contre tableaux vides ou sans colonnes
  if (rows.length === 0 || rows.every(row => row.length === 0)) {
    return '';
  }
  
  const numColumns = Math.max(...rows.map(row => row.length));
  
  // ✅ Protection contre division par zéro
  if (numColumns === 0) {
    return '';
  }

  // En-tête (première ligne)
  if (rows.length > 0) {
    const headerRow = rows[0];
    const headerCells = headerRow.map(cell => cell || '').slice(0, numColumns);
    lines.push('| ' + headerCells.join(' | ') + ' |');
    
    // Séparateur (deuxième ligne)
    const separator = '| ' + headerCells.map(() => '---').join(' | ') + ' |';
    lines.push(separator);
  }

  // Corps du tableau
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.map(cell => cell || '').slice(0, numColumns);
    // Compléter avec des cellules vides si nécessaire
    while (cells.length < numColumns) {
      cells.push('');
    }
    lines.push('| ' + cells.join(' | ') + ' |');
  }

  return lines.join('\n');
}

/**
 * Convertit une liste TipTap en markdown
 */
function convertListToMarkdown(
  listNode: { type: string; content?: Array<{ type: string; content?: unknown[] }> }
): string {
  if (!listNode.content || !Array.isArray(listNode.content)) {
    return '';
  }

  const lines: string[] = [];
  const isOrdered = listNode.type === 'orderedList';

  listNode.content.forEach((itemNode: unknown, index) => {
    const item = itemNode as TipTapNode & { content?: unknown[] };
    if (item.type === 'listItem' && item.content && Array.isArray(item.content)) {
      const itemText = item.content
        .map((child: unknown) => extractTextFromNode(child as TipTapNode))
        .join(' ')
        .trim();
      
      if (itemText) {
        const prefix = isOrdered ? `${index + 1}. ` : '- ';
        lines.push(prefix + itemText);
      }
    }
  });

  return lines.join('\n');
}

/**
 * Convertit une task list TipTap en markdown
 */
function convertTaskListToMarkdown(
  taskListNode: { type: string; content?: Array<{ type: string; attrs?: Record<string, unknown>; content?: unknown[] }> }
): string {
  if (!taskListNode.content || !Array.isArray(taskListNode.content)) {
    return '';
  }

  const lines: string[] = [];

  taskListNode.content.forEach((itemNode: unknown) => {
    const item = itemNode as TipTapNode & { attrs?: Record<string, unknown>; content?: unknown[] };
    if (item.type === 'taskItem' && item.content && Array.isArray(item.content)) {
      const checked = item.attrs?.checked === true;
      const itemText = item.content
        .map((child: unknown) => extractTextFromNode(child as TipTapNode))
        .join(' ')
        .trim();
      
      if (itemText) {
        lines.push(`- [${checked ? 'x' : ' '}] ${itemText}`);
      }
    }
  });

  return lines.join('\n');
}

/**
 * Extrait le markdown complet d'une sélection (avec tableaux, listes, etc.)
 * 
 * @param editor - Instance de l'éditeur TipTap
 * @param from - Position de début de la sélection
 * @param to - Position de fin de la sélection
 * @returns Markdown avec structure préservée (tableaux, listes, titres, etc.)
 */
export function extractSelectionMarkdown(editor: Editor, from: number, to: number): string {
  try {
    // ✅ Validation des paramètres
    if (from < 0 || to < 0 || from > to) {
      logger.warn(LogCategory.EDITOR, '[canvasSelectionUtils] Positions invalides, fallback texte', {
        from,
        to
      });
      return extractSelectionText(editor, from, to);
    }

    const { state } = editor;
    const docSize = state.doc.content.size;
    
    // ✅ Vérifier que les positions sont dans les limites du document
    if (from > docSize || to > docSize) {
      logger.warn(LogCategory.EDITOR, '[canvasSelectionUtils] Positions hors limites, fallback texte', {
        from,
        to,
        docSize
      });
      return extractSelectionText(editor, Math.min(from, docSize), Math.min(to, docSize));
    }
    
    // Extraire le slice de la plage (méthode ProseMirror)
    const slice = state.doc.slice(from, to);
    
    // ✅ Vérifier que le slice a du contenu
    if (!slice.content || slice.content.size === 0) {
      return extractSelectionText(editor, from, to);
    }
    
    // Convertir le slice en JSON
    const jsonContent: Array<{ type: string; content?: unknown[]; attrs?: Record<string, unknown>; text?: string }> = [];
    
    // Parcourir les nœuds dans le slice (avec limite de sécurité)
    let nodeCount = 0;
    const MAX_NODES = 1000; // Limite pour éviter les boucles infinies
    
    slice.content.forEach((node) => {
      if (nodeCount >= MAX_NODES) {
        logger.warn(LogCategory.EDITOR, '[canvasSelectionUtils] Trop de nœuds, troncature', {
          nodeCount,
          maxNodes: MAX_NODES
        });
        return;
      }
      
      try {
        const nodeJSON = node.toJSON();
        jsonContent.push(nodeJSON);
        nodeCount++;
      } catch (nodeError) {
        logger.warn(LogCategory.EDITOR, '[canvasSelectionUtils] Erreur conversion nœud, ignoré', {
          error: nodeError instanceof Error ? nodeError.message : String(nodeError)
        });
      }
    });

    // Si on a du contenu JSON, le convertir en markdown
    if (jsonContent.length > 0) {
      try {
        const markdownLines = jsonContent
          .map(node => {
            try {
              return convertNodeToMarkdown(node);
            } catch (conversionError) {
              logger.warn(LogCategory.EDITOR, '[canvasSelectionUtils] Erreur conversion markdown nœud, ignoré', {
                error: conversionError instanceof Error ? conversionError.message : String(conversionError),
                nodeType: node.type
              });
              return '';
            }
          })
          .filter(line => line.trim())
          .join('\n\n');
        
        if (markdownLines.trim()) {
          return markdownLines.trim();
        }
      } catch (conversionError) {
        logger.warn(LogCategory.EDITOR, '[canvasSelectionUtils] Erreur conversion markdown globale, fallback texte', {
          error: conversionError instanceof Error ? conversionError.message : String(conversionError)
        });
      }
    }

    // Fallback : texte avec sauts de ligne
    return extractSelectionText(editor, from, to);
  } catch (error) {
    logger.warn(LogCategory.EDITOR, '[canvasSelectionUtils] Erreur extraction markdown, fallback texte', {
      error: error instanceof Error ? error.message : String(error)
    });
    // Fallback sûr : texte avec sauts de ligne
    return extractSelectionText(editor, from, to);
  }
}

/**
 * Crée et émet une sélection de canvas en une seule opération
 * 
 * @param text - Texte sélectionné (peut être markdown ou texte avec sauts de ligne)
 * @param noteId - ID de la note (optionnel)
 * @param noteSlug - Slug de la note (optionnel)
 * @param noteTitle - Titre de la note (optionnel)
 * @param startPos - Position de début (optionnel)
 * @param endPos - Position de fin (optionnel)
 * @returns true si l'événement a été émis, false sinon
 */
export function createAndEmitCanvasSelection(
  text: string,
  noteId?: string,
  noteSlug?: string,
  noteTitle?: string,
  startPos?: number,
  endPos?: number
): boolean {
  const selection = createCanvasSelection(text, noteId, noteSlug, noteTitle, startPos, endPos);
  return emitCanvasSelection(selection);
}

