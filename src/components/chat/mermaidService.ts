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
  if (!content || typeof content !== 'string') {
    return [{ type: 'text', content: '', startIndex: 0, endIndex: 0 }];
  }

  const blocks: ContentBlock[] = [];
  
  // Regex amélioré pour détecter les blocs Mermaid
  const mermaidRegex = /```mermaid(?::\w+)?\s*\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const [fullMatch, mermaidContent] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Ajouter le texte avant le bloc Mermaid
    if (startIndex > lastIndex) {
      const textContent = content.slice(lastIndex, startIndex);
      if (textContent.trim()) {
        blocks.push({
          type: 'text',
          content: textContent,
          startIndex: lastIndex,
          endIndex: startIndex
        });
      }
    }

    // Ajouter le bloc Mermaid
    if (mermaidContent && mermaidContent.trim()) {
      blocks.push({
        type: 'mermaid',
        content: mermaidContent.trim(),
        startIndex,
        endIndex
      });
    }

    lastIndex = endIndex;
  }

  // Ajouter le texte restant après le dernier bloc Mermaid
  if (lastIndex < content.length) {
    const remainingContent = content.slice(lastIndex);
    if (remainingContent.trim()) {
      blocks.push({
        type: 'text',
        content: remainingContent,
        startIndex: lastIndex,
        endIndex: content.length
      });
    }
  }

  // Si aucun bloc trouvé, retourner le contenu entier comme texte
  if (blocks.length === 0) {
    blocks.push({
      type: 'text',
      content: content,
      startIndex: 0,
      endIndex: content.length
    });
  }

  return blocks;
}

/**
 * Valide si le contenu Mermaid est syntaxiquement correct.
 * Validation basique pour éviter les erreurs évidentes.
 */
export function validateMermaidSyntax(content: string): { isValid: boolean; error?: string } {
  try {
    if (!content || typeof content !== 'string') {
      return { isValid: false, error: 'Contenu invalide ou vide' };
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return { isValid: false, error: 'Contenu vide' };
    }

    // Validation basique des types de diagrammes supportés
    const supportedTypes = [
      'flowchart', 'graph', 'sequenceDiagram', 'sequence', 'classDiagram', 'class',
      'pie', 'gantt', 'gitGraph', 'journey', 'er', 'stateDiagram', 'state'
    ];

    const firstLine = trimmedContent.split('\n')[0].trim();
    const hasValidType = supportedTypes.some(type => 
      firstLine.toLowerCase().startsWith(type.toLowerCase())
    );

    if (!hasValidType) {
      return { 
        isValid: false, 
        error: `Type de diagramme non supporté. Types supportés: ${supportedTypes.join(', ')}` 
      };
    }

    // Validation de la structure minimale
    if (trimmedContent.split('\n').length < 2) {
      return { isValid: false, error: 'Diagramme trop court (minimum 2 lignes)' };
    }

    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Erreur de validation inconnue' 
    };
  }
}

/**
 * Nettoie et formate le contenu Mermaid
 */
export function cleanMermaidContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .trim()
    .replace(/^\s*```mermaid(?::\w+)?\s*\n?/, '') // Supprimer l'en-tête
    .replace(/\n?\s*```\s*$/, '') // Supprimer la fermeture
    .trim();
}

/**
 * Extrait le type de diagramme Mermaid
 */
export function getMermaidDiagramType(content: string): string {
  if (!content || typeof content !== 'string') {
    return 'Mermaid';
  }

  const firstLine = content.trim().split('\n')[0].trim();
  
  // Mapping des types de diagrammes avec détection plus robuste
  const typeMapping: { [key: string]: string } = {
    'flowchart': 'Flowchart',
    'graph': 'Flowchart',
    'sequencediagram': 'Sequence Diagram',
    'sequence': 'Sequence Diagram',
    'classdiagram': 'Class Diagram',
    'class': 'Class Diagram',
    'pie': 'Pie Chart',
    'gantt': 'Gantt Chart',
    'gitgraph': 'Git Graph',
    'journey': 'Journey',
    'er': 'ER Diagram',
    'statediagram': 'State Diagram',
    'state': 'State Diagram',
    'mindmap': 'Mind Map',
    'timeline': 'Timeline',
    'quadrantchart': 'Quadrant Chart',
    'requirement': 'Requirement Diagram',
    'c4context': 'C4 Context',
    'c4container': 'C4 Container',
    'c4component': 'C4 Component',
    'c4dynamic': 'C4 Dynamic'
  };

  const detectedType = Object.keys(typeMapping).find(type => 
    firstLine.toLowerCase().startsWith(type.toLowerCase())
  );

  return detectedType ? typeMapping[detectedType] : 'Mermaid';
}

/**
 * Normalise le contenu Mermaid pour améliorer la compatibilité
 */
export function normalizeMermaidContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let normalized = content.trim();

  // Normaliser les types de diagrammes
  const typeMapping: { [key: string]: string } = {
    'graph': 'flowchart',
    'sequencediagram': 'sequenceDiagram',
    'classdiagram': 'classDiagram',
    'gitgraph': 'gitGraph',
    'statediagram': 'stateDiagram'
  };

  Object.entries(typeMapping).forEach(([oldType, newType]) => {
    const regex = new RegExp(`^${oldType}\\s`, 'i');
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, `${newType} `);
    }
  });

  // Ajouter des espaces après les flèches si manquants
  normalized = normalized.replace(/([a-zA-Z0-9_])->/g, '$1 -->');
  normalized = normalized.replace(/([a-zA-Z0-9_])-->/g, '$1 -->');

  return normalized;
} 