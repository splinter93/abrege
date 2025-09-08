/**
 * Classe de base pour tous les handlers d'API V2
 * Fournit les fonctionnalités communes et l'interface standardisée
 */

import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import type {
  BaseHandler,
  ApiV2Context,
  ApiV2Response,
  ValidationResult,
  ToolDefinition,
  RefResolutionResult
} from '../types/ApiV2Types';

export abstract class BaseHandlerImpl implements BaseHandler {
  protected readonly supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  abstract readonly name: string;
  abstract readonly supportedOperations: string[];

  /**
   * Point d'entrée principal pour l'exécution des opérations
   */
  async execute(operation: string, params: unknown, context: ApiV2Context): Promise<ApiV2Response> {
    const startTime = Date.now();
    const traceId = `handler-${this.name}-${operation}-${startTime}`;

    try {
      logger.info(`[${this.name}Handler] 🚀 Exécution ${operation}`, {
        traceId,
        operation,
        paramsKeys: params && typeof params === 'object' ? Object.keys(params) : [],
        userId: context.userId
      });

      // 1. Validation des paramètres
      const validation = this.validateParams(operation, params);
      if (!validation.valid) {
        logger.warn(`[${this.name}Handler] ❌ Validation échouée`, {
          traceId,
          operation,
          errors: validation.errors
        });
        return this.createErrorResponse(
          `Validation failed: ${validation.errors.join(', ')}`,
          'VALIDATION_ERROR',
          traceId,
          Date.now() - startTime
        );
      }

      // 2. Exécution de l'opération spécifique
      const result = await this.executeOperation(operation, params, context);

      const executionTime = Date.now() - startTime;
      logger.info(`[${this.name}Handler] ✅ ${operation} exécuté avec succès`, {
        traceId,
        operation,
        executionTime
      });

      return this.createSuccessResponse(result, traceId, executionTime);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[${this.name}Handler] ❌ Erreur ${operation}:`, {
        traceId,
        operation,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Erreur interne du serveur',
        'INTERNAL_ERROR',
        traceId,
        executionTime
      );
    }
  }

  /**
   * Validation des paramètres - à implémenter par chaque handler
   */
  abstract validateParams(operation: string, params: unknown): ValidationResult;

  /**
   * Exécution de l'opération spécifique - à implémenter par chaque handler
   */
  protected abstract executeOperation(
    operation: string,
    params: unknown,
    context: ApiV2Context
  ): Promise<unknown>;

  /**
   * Définitions des tools - à implémenter par chaque handler
   */
  abstract getToolDefinitions(): ToolDefinition[];

  // ============================================================================
  // MÉTHODES UTILITAIRES COMMUNES
  // ============================================================================

  /**
   * Résolution d'une référence (ID ou slug) vers un ID
   */
  protected async resolveRef(
    ref: string,
    resourceType: 'note' | 'folder' | 'classeur' | 'agent',
    userId: string,
    context: ApiV2Context
  ): Promise<RefResolutionResult> {
    try {
      // Si c'est déjà un UUID, le retourner directement
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
      if (isUUID) {
        return { success: true, id: ref, type: resourceType };
      }

      // Sinon, chercher par slug
      const tableName = this.getTableName(resourceType);
      const { data, error } = await this.supabase
        .from(tableName)
        .select('id')
        .eq('slug', ref)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: `${resourceType} non trouvé`
        };
      }

      return {
        success: true,
        id: data.id,
        type: resourceType
      };

    } catch (error) {
      logger.error(`[${this.name}Handler] ❌ Erreur résolution ref ${ref}:`, error);
      return {
        success: false,
        error: 'Erreur lors de la résolution de la référence'
      };
    }
  }

  /**
   * Conversion du type de ressource vers le nom de table
   */
  private getTableName(resourceType: string): string {
    switch (resourceType) {
      case 'note': return 'articles';
      case 'folder': return 'folders';
      case 'classeur': return 'classeurs';
      case 'agent': return 'agents';
      default: throw new Error(`Type de ressource non supporté: ${resourceType}`);
    }
  }

  /**
   * Création d'une réponse de succès
   */
  protected createSuccessResponse(
    data: unknown,
    traceId: string,
    executionTime: number
  ): ApiV2Response {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime,
        operation: 'unknown',
        traceId
      }
    };
  }

  /**
   * Création d'une réponse d'erreur
   */
  protected createErrorResponse(
    error: string,
    code: string,
    traceId: string,
    executionTime: number
  ): ApiV2Response {
    return {
      success: false,
      error,
      code,
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime,
        operation: 'unknown',
        traceId
      }
    };
  }

  /**
   * Validation de base des paramètres communs
   */
  protected validateCommonParams(params: unknown): ValidationResult {
    const errors: string[] = [];

    if (!params || typeof params !== 'object') {
      errors.push('Les paramètres doivent être un objet');
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validation d'une référence (ID ou slug)
   */
  protected validateRef(ref: unknown, fieldName: string = 'ref'): ValidationResult {
    const errors: string[] = [];

    if (!ref || typeof ref !== 'string' || ref.trim().length === 0) {
      errors.push(`${fieldName} est requis et doit être une chaîne non vide`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validation d'un titre
   */
  protected validateTitle(title: unknown, fieldName: string = 'title'): ValidationResult {
    const errors: string[] = [];

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push(`${fieldName} est requis et doit être une chaîne non vide`);
    } else if (title.length > 255) {
      errors.push(`${fieldName} ne peut pas dépasser 255 caractères`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validation d'un ID UUID
   */
  protected validateUUID(id: unknown, fieldName: string = 'id'): ValidationResult {
    const errors: string[] = [];

    if (!id || typeof id !== 'string') {
      errors.push(`${fieldName} est requis et doit être une chaîne`);
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      errors.push(`${fieldName} doit être un UUID valide`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validation d'un nombre positif
   */
  protected validatePositiveNumber(
    value: unknown,
    fieldName: string,
    min: number = 0,
    max?: number
  ): ValidationResult {
    const errors: string[] = [];

    if (value === undefined || value === null) {
      return { valid: true, errors: [] }; // Optionnel
    }

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${fieldName} doit être un nombre valide`);
    } else if (value < min) {
      errors.push(`${fieldName} doit être supérieur ou égal à ${min}`);
    } else if (max !== undefined && value > max) {
      errors.push(`${fieldName} doit être inférieur ou égal à ${max}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validation d'une chaîne avec longueur
   */
  protected validateString(
    value: unknown,
    fieldName: string,
    required: boolean = false,
    maxLength?: number
  ): ValidationResult {
    const errors: string[] = [];

    if (required && (!value || typeof value !== 'string' || value.trim().length === 0)) {
      errors.push(`${fieldName} est requis et doit être une chaîne non vide`);
    } else if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        errors.push(`${fieldName} doit être une chaîne`);
      } else if (maxLength && value.length > maxLength) {
        errors.push(`${fieldName} ne peut pas dépasser ${maxLength} caractères`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
