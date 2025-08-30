/**
 * Service Mermaid unifié pour tout le projet
 * Gère la détection, validation et normalisation des diagrammes Mermaid
 */

export interface MermaidBlock {
  type: 'mermaid';
  content: string;
  startIndex: number;
  endIndex: number;
  validation?: MermaidValidation;
}

export interface TextBlock {
  type: 'text';
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface MermaidValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  diagramType: string;
}

export type ContentBlock = MermaidBlock | TextBlock;

/**
 * Détecte les blocs Mermaid dans le contenu markdown
 * Supporte les formats :
 * - ```mermaid
 * - ```mermaid:flowchart
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
export function validateMermaidSyntax(content: string): MermaidValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      errors: ['Contenu vide ou invalide'],
      warnings: [],
      diagramType: 'unknown'
    };
  }

  const trimmedContent = content.trim();
  
  if (trimmedContent.length === 0) {
    return {
      isValid: false,
      errors: ['Contenu vide'],
      warnings: [],
      diagramType: 'unknown'
    };
  }

  // Détecter le type de diagramme
  const diagramType = getMermaidDiagramType(trimmedContent);
  
  // Validation basique selon le type
  switch (diagramType) {
    case 'flowchart':
      if (!trimmedContent.includes('-->') && !trimmedContent.includes('---')) {
        warnings.push('Flowchart sans connexions détectées');
      }
      break;
      
    case 'sequence':
      if (!trimmedContent.includes('->>') && !trimmedContent.includes('-->>')) {
        warnings.push('Diagramme de séquence sans messages détectés');
      }
      break;
      
    case 'class':
      if (!trimmedContent.includes('class') && !trimmedContent.includes('+') && !trimmedContent.includes('-')) {
        warnings.push('Diagramme de classe sans attributs/méthodes détectés');
      }
      break;
      
    case 'state':
      if (!trimmedContent.includes('state') && !trimmedContent.includes('[*]')) {
        warnings.push('Diagramme d\'état sans états détectés');
      }
      break;
      
    case 'gantt':
      if (!trimmedContent.includes('section') && !trimmedContent.includes(':')) {
        warnings.push('Diagramme de Gantt sans sections détectées');
      }
      break;
      
    case 'pie':
      if (!trimmedContent.includes(':') || !trimmedContent.includes('"')) {
        warnings.push('Graphique circulaire sans données détectées');
      }
      break;
      
    case 'gitGraph':
      if (!trimmedContent.includes('commit') && !trimmedContent.includes('branch')) {
        warnings.push('Graphe Git sans commits/branches détectés');
      }
      break;
      
    case 'journey':
      if (!trimmedContent.includes('title') && !trimmedContent.includes('section')) {
        warnings.push('Diagramme de voyage sans titre/sections détectés');
      }
      break;
      
    case 'er':
      if (!trimmedContent.includes('entity') && !trimmedContent.includes('relationship')) {
        warnings.push('Diagramme entité-relation sans entités détectées');
      }
      break;
  }

  // Validation générale
  if (trimmedContent.length < 10) {
    warnings.push('Contenu très court, risque d\'erreur de syntaxe');
  }

  // Vérifier les caractères spéciaux problématiques
  if (trimmedContent.includes('\\') && !trimmedContent.includes('\\\\')) {
    warnings.push('Caractères d\'échappement non échappés détectés');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    diagramType
  };
}

/**
 * Normalise le contenu Mermaid pour assurer la compatibilité
 * et corriger les problèmes courants.
 */
export function normalizeMermaidContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let normalized = content.trim();

  // Supprimer les commentaires HTML
  normalized = normalized.replace(/<!--[\s\S]*?-->/g, '');
  
  // Supprimer les commentaires de ligne
  normalized = normalized.replace(/^\s*%.*$/gm, '');
  
  // Normaliser les espaces multiples
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Normaliser les retours à la ligne
  normalized = normalized.replace(/\r\n/g, '\n');
  normalized = normalized.replace(/\r/g, '\n');
  
  // Supprimer les espaces en début et fin de ligne
  normalized = normalized.split('\n').map(line => line.trim()).join('\n');
  
  // Supprimer les lignes vides multiples
  normalized = normalized.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Normaliser les indentations
  normalized = normalized.split('\n').map(line => {
    if (line.trim() === '') return '';
    return line.trim();
  }).join('\n');

  return normalized;
}

/**
 * Détecte le type de diagramme Mermaid basé sur le contenu
 */
export function getMermaidDiagramType(content: string): string {
  if (!content || typeof content !== 'string') {
    return 'unknown';
  }

  const normalizedContent = content.toLowerCase().trim();
  
  // Détection par mots-clés
  if (normalizedContent.startsWith('flowchart') || 
      normalizedContent.startsWith('graph') ||
      normalizedContent.includes('-->') ||
      normalizedContent.includes('---')) {
    return 'flowchart';
  }
  
  if (normalizedContent.startsWith('sequencediagram') ||
      normalizedContent.startsWith('sequence') ||
      normalizedContent.includes('->>') ||
      normalizedContent.includes('-->>')) {
    return 'sequence';
  }
  
  if (normalizedContent.startsWith('classdiagram') ||
      normalizedContent.startsWith('class') ||
      normalizedContent.includes('class ') ||
      normalizedContent.includes('+') ||
      normalizedContent.includes('-')) {
    return 'class';
  }
  
  if (normalizedContent.startsWith('statediagram') ||
      normalizedContent.startsWith('state') ||
      normalizedContent.includes('state ') ||
      normalizedContent.includes('[*]')) {
    return 'state';
  }
  
  if (normalizedContent.startsWith('gantt') ||
      normalizedContent.includes('section') ||
      normalizedContent.includes(':')) {
    return 'gantt';
  }
  
  if (normalizedContent.startsWith('pie') ||
      normalizedContent.includes('title') ||
      (normalizedContent.includes(':') && normalizedContent.includes('"'))) {
    return 'pie';
  }
  
  if (normalizedContent.startsWith('gitgraph') ||
      normalizedContent.startsWith('git') ||
      normalizedContent.includes('commit') ||
      normalizedContent.includes('branch')) {
    return 'gitGraph';
  }
  
  if (normalizedContent.startsWith('journey') ||
      normalizedContent.includes('title') ||
      normalizedContent.includes('section')) {
    return 'journey';
  }
  
  if (normalizedContent.startsWith('er') ||
      normalizedContent.startsWith('entity') ||
      normalizedContent.includes('entity ') ||
      normalizedContent.includes('relationship')) {
    return 'er';
  }
  
  return 'unknown';
}

/**
 * Nettoie le contenu Mermaid en supprimant les éléments problématiques
 */
export function cleanMermaidContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let cleaned = content;

  // Supprimer les balises HTML non autorisées
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed[^>]*>/gi, '');
  
  // Supprimer les attributs dangereux
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s+javascript\s*:/gi, '');
  cleaned = cleaned.replace(/\s+data\s*:\s*text\/html/gi, '');
  
  // Nettoyer les espaces et retours à la ligne
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');
  cleaned = cleaned.replace(/\t/g, '  ');
  
  return cleaned;
}

/**
 * Vérifie si le contenu contient des diagrammes Mermaid valides
 */
export function hasValidMermaidBlocks(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const blocks = detectMermaidBlocks(content);
  return blocks.some(block => 
    block.type === 'mermaid' && 
    validateMermaidSyntax(block.content).isValid
  );
}

/**
 * Extrait tous les blocs Mermaid valides du contenu
 */
export function extractValidMermaidBlocks(content: string): MermaidBlock[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const blocks = detectMermaidBlocks(content);
  return blocks
    .filter((block): block is MermaidBlock => block.type === 'mermaid')
    .filter(block => validateMermaidSyntax(block.content).isValid);
}

/**
 * Génère un ID unique pour un diagramme Mermaid
 */
export function generateMermaidId(prefix: string = 'mermaid'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Vérifie si un SVG contient une erreur Mermaid
 */
export function isMermaidErrorSvg(svgContent: string): boolean {
  if (!svgContent || typeof svgContent !== 'string') {
    return false;
  }
  
  const lower = svgContent.toLowerCase();
  
  // Indicateurs d'erreur Mermaid
  const errorIndicators = [
    'aria-roledescription="error"',
    'aria-roledescription=\'error\'',
    'class="error-icon"',
    'class=\'error-icon\'',
    'class="error-text"',
    'class=\'error-text\'',
    'syntax error in text',
    'mermaid version',
    'error'
  ];
  
  return errorIndicators.some(indicator => lower.includes(indicator));
}
