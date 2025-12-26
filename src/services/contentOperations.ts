/**
 * Service de gestion des opérations de contenu
 * 
 * Réutilise ContentApplier pour garantir une unique source de vérité
 * Utilisé par :
 * - /api/v2/note/[ref]/content:apply (persistance)
 * - CanvasStateManager (mémoire, streaming)
 */

import { ContentApplier, ContentOperation, OperationResult } from '@/utils/contentApplyUtils';
import { logApi, LogCategory } from '@/utils/logger';

export interface ApplyOperationsResult {
  content: string;
  results: OperationResult[];
  charDiff: { added: number; removed: number };
  success: boolean;
  failedOps: number;
}

/**
 * Applique une liste d'opérations sur du contenu (fonction pure)
 * 
 * @param content - Contenu initial
 * @param operations - Liste d'opérations à appliquer
 * @returns Résultat avec nouveau contenu et détails des opérations
 */
export async function applyOperationsToContent(
  content: string,
  operations: ContentOperation[]
): Promise<ApplyOperationsResult> {
  const startTime = Date.now();
  
  logApi.debug('[contentOperations] Début application opérations', {
    contentLength: content.length,
    operationsCount: operations.length
  });

  // Utiliser ContentApplier (source de vérité unique)
  const applier = new ContentApplier(content);
  const result = await applier.applyOperations(operations);

  const failedOps = result.results.filter(r => r.status === 'failed').length;
  const success = failedOps === 0;

  const duration = Date.now() - startTime;
  logApi.debug('[contentOperations] Opérations appliquées', {
    duration,
    success,
    appliedOps: result.results.filter(r => r.status === 'applied').length,
    skippedOps: result.results.filter(r => r.status === 'skipped').length,
    failedOps,
    charDiff: result.charDiff
  });

  return {
    content: result.content,
    results: result.results,
    charDiff: result.charDiff,
    success,
    failedOps
  };
}

/**
 * Valide une opération avant application
 * 
 * @param op - Opération à valider
 * @returns true si valide, sinon erreur
 */
export function validateOperation(op: ContentOperation): { valid: boolean; error?: string } {
  // Validation de base
  if (!op.id || typeof op.id !== 'string') {
    return { valid: false, error: 'op.id requis (string)' };
  }

  if (!op.action || !['insert', 'replace', 'delete', 'upsert_section'].includes(op.action)) {
    return { valid: false, error: 'op.action invalide' };
  }

  if (!op.target || !op.target.type) {
    return { valid: false, error: 'op.target.type requis' };
  }

  // Validation spécifique selon le type de cible
  switch (op.target.type) {
    case 'heading':
      if (!op.target.heading || (!op.target.heading.path?.length && !op.target.heading.heading_id)) {
        return { valid: false, error: 'heading.path ou heading.heading_id requis' };
      }
      break;
    case 'regex':
      if (!op.target.regex || !op.target.regex.pattern) {
        return { valid: false, error: 'regex.pattern requis' };
      }
      break;
    case 'position':
      if (!op.target.position || !op.target.position.mode) {
        return { valid: false, error: 'position.mode requis' };
      }
      break;
    case 'anchor':
      if (!op.target.anchor || !op.target.anchor.name) {
        return { valid: false, error: 'anchor.name requis' };
      }
      break;
    default:
      return { valid: false, error: `target.type inconnu: ${op.target.type}` };
  }

  // Validation du contenu (requis pour insert/replace/upsert)
  if (['insert', 'replace', 'upsert_section'].includes(op.action) && !op.content) {
    return { valid: false, error: `content requis pour action ${op.action}` };
  }

  return { valid: true };
}

/**
 * Batch des opérations (pour checkpoint)
 * Regroupe plusieurs opérations en une seule
 */
export function batchOperations(ops: ContentOperation[]): ContentOperation[] {
  // Pour l'instant, retourne les ops telles quelles
  // Plus tard, on pourrait implémenter une logique de fusion intelligente
  return ops;
}

