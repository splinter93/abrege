/**
 * Handler pour les opérations utilitaires
 * Implémentation stricte et production-ready des opérations utilitaires
 */

import { BaseHandlerImpl } from '../core/BaseHandler';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { simpleLogger as logger } from '@/utils/logger';
import type {
  ValidationResult,
  ToolDefinition,
  ApiV2Context,
  DeleteResourceParams,
  UserProfile
} from '../types/ApiV2Types';

export class UtilsHandler extends BaseHandlerImpl {
  readonly name = 'utils';
  readonly supportedOperations = [
    'deleteResource',
    'getUserProfile'
  ];

  /**
   * Validation des paramètres pour chaque opération
   */
  validateParams(operation: string, params: unknown): ValidationResult {
    const baseValidation = this.validateCommonParams(params);
    if (!baseValidation.valid) {
      return baseValidation;
    }

    const errors: string[] = [];

    switch (operation) {
      case 'deleteResource':
        errors.push(...this.validateDeleteResourceParams(params).errors);
        break;

      case 'getUserProfile':
        // Pas de paramètres requis pour getUserProfile
        break;

      default:
        errors.push(`Opération non supportée: ${operation}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Exécution des opérations
   */
  protected async executeOperation(
    operation: string,
    params: unknown,
    context: ApiV2Context
  ): Promise<unknown> {
    switch (operation) {
      case 'deleteResource':
        return await this.deleteResource(params as DeleteResourceParams, context);

      case 'getUserProfile':
        return await this.getUserProfile(context);

      default:
        throw new Error(`Opération non implémentée: ${operation}`);
    }
  }

  /**
   * Définitions des tools pour ChatGPT
   */
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'deleteResource',
        description: 'Supprimer une ressource (note, dossier, classeur ou fichier)',
        parameters: {
          type: 'object',
          properties: {
            resource: {
              type: 'string',
              enum: ['note', 'folder', 'classeur', 'file'],
              description: 'Type de ressource à supprimer'
            },
            ref: {
              type: 'string',
              description: 'Référence de la ressource (UUID ou slug)'
            }
          },
          required: ['resource', 'ref']
        },
        handler: 'utils',
        operation: 'deleteResource'
      },
      {
        name: 'getUserProfile',
        description: 'Récupérer le profil utilisateur actuel',
        parameters: {
          type: 'object',
          properties: {}
        },
        handler: 'utils',
        operation: 'getUserProfile'
      }
    ];
  }

  // ============================================================================
  // MÉTHODES DE VALIDATION SPÉCIFIQUES
  // ============================================================================

  private validateDeleteResourceParams(params: unknown): ValidationResult {
    const p = params as DeleteResourceParams;
    const errors: string[] = [];

    // Validation du type de ressource
    if (!p.resource || !['note', 'folder', 'classeur', 'file'].includes(p.resource)) {
      errors.push('resource doit être note, folder, classeur ou file');
    }

    // Validation de la référence
    errors.push(...this.validateRef(p.ref, 'ref').errors);

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // MÉTHODES D'IMPLÉMENTATION
  // ============================================================================

  private async deleteResource(params: DeleteResourceParams, context: ApiV2Context): Promise<unknown> {
    const { resource, ref } = params;

    logger.info(`[UtilsHandler] 🗑️ Suppression ${resource}: ${ref}`, {
      userId: context.userId,
      resource,
      ref
    });

    let deleteResult;

    switch (resource) {
      case 'note':
        deleteResult = await V2DatabaseUtils.deleteNote(ref, context.userId, {
          operation: 'deleteResource',
          component: 'UtilsHandler'
        });
        break;

      case 'classeur':
        deleteResult = await V2DatabaseUtils.deleteClasseur(ref, context.userId, {
          operation: 'deleteResource',
          component: 'UtilsHandler'
        });
        break;

      case 'folder':
        deleteResult = await V2DatabaseUtils.deleteFolder(ref, context.userId, {
          operation: 'deleteResource',
          component: 'UtilsHandler'
        });
        break;

      case 'file':
        // File deletion not yet implemented in V2DatabaseUtils
        throw new Error('Suppression de fichiers non encore implémentée');

      default:
        throw new Error(`Type de ressource non supporté: ${resource}`);
    }

    if (!deleteResult.success) {
      throw new Error(deleteResult.error || `Erreur lors de la suppression du ${resource}`);
    }

    return {
      success: true,
      message: `${resource} supprimé avec succès`,
      resource_type: resource,
      resource_ref: ref,
      deleted_at: new Date().toISOString()
    };
  }

  private async getUserProfile(context: ApiV2Context): Promise<UserProfile> {
    const result = await V2DatabaseUtils.getUserInfo(context.userId, {
      operation: 'getUserProfile',
      component: 'UtilsHandler'
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erreur lors de la récupération du profil utilisateur');
    }

    return {
      id: result.data.id,
      email: result.data.email,
      name: result.data.name,
      avatar_url: result.data.avatar_url,
      created_at: result.data.created_at,
      updated_at: result.data.updated_at
    };
  }
}
