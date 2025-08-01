export interface MermaidBlock {
  type: 'mermaid';
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface TextBlock {
  type: 'text';
  content: string;
  startIndex: number;
  endIndex: number;
}

export type ContentBlock = MermaidBlock | TextBlock;

/**
 * Détecte les blocs Mermaid dans le contenu markdown
 * Supporte les formats :
 * - ```mermaid
 * - ```mermaid:
 * - ```mermaid
 */
export function detectMermaidBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const mermaidRegex = /```mermaid(?::\w+)?\s*\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const [fullMatch, mermaidContent] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Ajouter le texte avant le bloc Mermaid
    if (startIndex > lastIndex) {
      blocks.push({
        type: 'text',
        content: content.slice(lastIndex, startIndex),
        startIndex: lastIndex,
        endIndex: startIndex
      });
    }

    // Ajouter le bloc Mermaid
    blocks.push({
      type: 'mermaid',
      content: mermaidContent.trim(),
      startIndex,
      endIndex
    });

    lastIndex = endIndex;
  }

  // Ajouter le texte restant après le dernier bloc Mermaid
  if (lastIndex < content.length) {
    blocks.push({
      type: 'text',
      content: content.slice(lastIndex),
      startIndex: lastIndex,
      endIndex: content.length
    });
  }

  return blocks;
}

/**
 * Valide si le contenu Mermaid est syntaxiquement correct
 */
export function validateMermaidSyntax(content: string): { isValid: boolean; error?: string } {
  try {
    // Vérifications basiques
    if (!content.trim()) {
      return { isValid: false, error: 'Contenu vide' };
    }

    // Vérifier les types de diagrammes supportés
    const supportedTypes = [
      'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
      'stateDiagram', 'entityRelationshipDiagram', 'userJourney',
      'gantt', 'pie', 'gitgraph', 'journey', 'er'
    ];

    const firstLine = content.trim().split('\n')[0];
    const hasValidType = supportedTypes.some(type => 
      firstLine.toLowerCase().includes(type)
    );

    if (!hasValidType) {
      return { isValid: false, error: 'Type de diagramme non reconnu' };
    }

    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Erreur de validation' 
    };
  }
}

/**
 * Nettoie et formate le contenu Mermaid
 */
export function cleanMermaidContent(content: string): string {
  return content
    .trim()
    .replace(/^\s*```mermaid(?::\w+)?\s*\n?/, '') // Supprimer l'en-tête
    .replace(/\n?\s*```\s*$/, '') // Supprimer la fermeture
    .trim();
} 