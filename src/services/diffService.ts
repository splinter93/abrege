import { diffWords, diffLines, Change } from 'diff';

interface DiffResult {
  changes: Change[];
  addedLines: number;
  removedLines: number;
  modifiedSections: string[];
  timestamp: number;
  changeSize: 'small' | 'medium' | 'large'; // Nouveau: taille du changement
  confidence: number; // Nouveau: niveau de confiance (0-1)
}

interface DiffMetadata {
  noteId: string;
  previousContent: string;
  currentContent: string;
  diffResult: DiffResult;
  changeType: 'content' | 'title' | 'structure';
  userId: string;
  // Nouveau: support collaboratif
  collaboratorId?: string; // ID de l'utilisateur qui a fait le changement
  collaboratorName?: string; // Nom affiché de l'utilisateur
  sessionId?: string; // Session pour éviter les conflits
  deviceInfo?: {
    userAgent: string;
    platform: string;
    timestamp: number;
  };
}

class DiffService {
  private previousVersions: Map<string, string> = new Map();
  private diffHistory: Map<string, DiffMetadata[]> = new Map();
  private readonly MAX_CHANGES = 50; // Limite pour éviter les surcharges
  private readonly MIN_CONFIDENCE = 0.3; // Seuil de confiance minimum

  /**
   * Comparer deux versions d'une note et générer le diff
   */
  generateDiff(noteId: string, currentContent: string, previousContent?: string): DiffResult | null {
    const storedPrevious = this.previousVersions.get(noteId);
    const contentToCompare = previousContent || storedPrevious;

    if (!contentToCompare || contentToCompare === currentContent) {
      return null;
    }

    // Vérifier si le changement est trop important (risque de faux positif)
    const changeRatio = this.calculateChangeRatio(contentToCompare, currentContent);
    if (changeRatio > 0.8) {
      console.warn('⚠️ Changement trop important détecté, diff ignoré:', changeRatio);
      this.previousVersions.set(noteId, currentContent);
      return null;
    }

    // Diff ligne par ligne pour détecter les sections modifiées
    const lineDiff = diffLines(contentToCompare, currentContent, {
      ignoreWhitespace: false,
      newlineIsToken: true
    });

    // Diff mot par mot pour les détails fins (limité pour les gros changements)
    const wordDiff = this.generateOptimizedWordDiff(contentToCompare, currentContent, changeRatio);

    // Analyser les changements avec validation
    const changes = this.analyzeChanges(lineDiff);
    const modifiedSections = this.extractModifiedSections(lineDiff, contentToCompare);
    const confidence = this.calculateConfidence(changes, changeRatio);

    // Ignorer les changements avec faible confiance
    if (confidence < this.MIN_CONFIDENCE) {
      console.warn('⚠️ Diff ignoré (faible confiance):', confidence);
      this.previousVersions.set(noteId, currentContent);
      return null;
    }

    const result: DiffResult = {
      changes: wordDiff,
      addedLines: this.countAddedLines(lineDiff),
      removedLines: this.countRemovedLines(lineDiff),
      modifiedSections,
      timestamp: Date.now(),
      changeSize: this.categorizeChangeSize(changes),
      confidence
    };

    // Stocker la version actuelle pour la prochaine comparaison
    this.previousVersions.set(noteId, currentContent);

    return result;
  }

  /**
   * Calculer le ratio de changement entre deux versions
   */
  private calculateChangeRatio(oldContent: string, newContent: string): number {
    const oldLength = oldContent.length;
    const newLength = newContent.length;
    const maxLength = Math.max(oldLength, newLength);
    
    if (maxLength === 0) return 0;
    
    // Utiliser l'algorithme de Levenshtein pour un calcul plus précis
    const distance = this.levenshteinDistance(oldContent, newContent);
    return distance / maxLength;
  }

  /**
   * Distance de Levenshtein pour mesurer la similarité
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Générer un diff optimisé selon la taille du changement
   */
  private generateOptimizedWordDiff(oldContent: string, newContent: string, changeRatio: number): Change[] {
    if (changeRatio > 0.5) {
      // Gros changement: diff simplifié
      const changes = diffWords(oldContent, newContent);
      return changes.slice(0, this.MAX_CHANGES); // Limiter le nombre de changements
    } else {
      // Petit changement: diff détaillé
      return diffWords(oldContent, newContent);
    }
  }

  /**
   * Calculer le niveau de confiance du diff
   */
  private calculateConfidence(changes: Change[], changeRatio: number): number {
    const changeCount = changes.filter(c => c.added || c.removed).length;
    const totalChanges = changes.length;
    
    if (totalChanges === 0) return 0;
    
    // Facteurs de confiance
    const ratioFactor = 1 - changeRatio; // Moins de changement = plus de confiance
    const countFactor = Math.max(0, 1 - (changeCount / this.MAX_CHANGES)); // Moins de changements = plus de confiance
    const sizeFactor = changeCount > 0 ? Math.min(1, 10 / changeCount) : 1; // Changements de taille raisonnable
    
    return (ratioFactor * 0.4 + countFactor * 0.3 + sizeFactor * 0.3);
  }

  /**
   * Catégoriser la taille du changement
   */
  private categorizeChangeSize(changes: Change[]): 'small' | 'medium' | 'large' {
    const changeCount = changes.filter(c => c.added || c.removed).length;
    
    if (changeCount <= 5) return 'small';
    if (changeCount <= 20) return 'medium';
    return 'large';
  }

  /**
   * Analyser les types de changements avec validation
   */
  private analyzeChanges(lineDiff: Change[]): Change[] {
    return lineDiff
      .map(change => {
        if (change.added) {
          return { ...change, type: 'added' as const };
        } else if (change.removed) {
          return { ...change, type: 'removed' as const };
        } else {
          return { ...change, type: 'unchanged' as const };
        }
      })
      .filter(change => {
        // Filtrer les changements triviaux (espaces, retours à la ligne)
        if (change.added || change.removed) {
          const trimmed = change.value.trim();
          return trimmed.length > 0 && trimmed.length < 1000; // Éviter les blocs énormes
        }
        return true;
      });
  }

  /**
   * Extraire les sections modifiées (basé sur les headers markdown)
   */
  private extractModifiedSections(lineDiff: Change[], originalContent: string): string[] {
    const sections = new Set<string>();
    const lines = originalContent.split('\n');

    lineDiff.forEach(change => {
      if (change.added || change.removed) {
        const changeLines = change.value.split('\n');
        changeLines.forEach((line: string) => {
          const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headerMatch) {
            sections.add(headerMatch[2].trim());
          }
        });
      }
    });

    return Array.from(sections);
  }

  /**
   * Compter les lignes ajoutées
   */
  private countAddedLines(lineDiff: Change[]): number {
    return lineDiff
      .filter(change => change.added)
      .reduce((count, change) => count + change.value.split('\n').length - 1, 0);
  }

  /**
   * Compter les lignes supprimées
   */
  private countRemovedLines(lineDiff: Change[]): number {
    return lineDiff
      .filter(change => change.removed)
      .reduce((count, change) => count + change.value.split('\n').length - 1, 0);
  }

  /**
   * Stocker l'historique des diffs avec limitation
   */
  storeDiff(noteId: string, metadata: DiffMetadata): void {
    if (!this.diffHistory.has(noteId)) {
      this.diffHistory.set(noteId, []);
    }
    
    const history = this.diffHistory.get(noteId)!;
    history.push(metadata);
    
    // Garder seulement les 5 derniers diffs (réduit pour la performance)
    if (history.length > 5) {
      history.shift();
    }
  }

  /**
   * Récupérer l'historique des diffs pour une note
   */
  getDiffHistory(noteId: string): DiffMetadata[] {
    return this.diffHistory.get(noteId) || [];
  }

  /**
   * Nettoyer l'historique d'une note
   */
  clearDiffHistory(noteId: string): void {
    this.diffHistory.delete(noteId);
    this.previousVersions.delete(noteId);
  }

  /**
   * Vérifier si un diff est valide pour l'affichage
   */
  isValidDiff(diff: DiffResult): boolean {
    return diff.confidence >= this.MIN_CONFIDENCE && 
           diff.changes.length > 0 && 
           diff.changes.length <= this.MAX_CHANGES;
  }
}

// Instance globale
const diffService = new DiffService();

export { diffService, type DiffResult, type DiffMetadata }; 