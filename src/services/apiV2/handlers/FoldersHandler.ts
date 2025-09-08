/**
 * Handler pour toutes les opérations liées aux dossiers
 * Implémentation stricte et production-ready des 4 opérations dossiers
 */

import { BaseHandlerImpl } from '../core/BaseHandler';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { simpleLogger as logger } from '@/utils/logger';
import type {
  ValidationResult,
  ToolDefinition,
  ApiV2Context,
  CreateFolderParams,
  UpdateFolderParams,
  MoveFolderParams,
  Folder
} from '../types/ApiV2Types';

export class FoldersHandler extends BaseHandlerImpl {
  readonly name = 'folders';
  readonly supportedOperations = [
    'getFolder',
    'createFolder',
    'updateFolder',
    'getFolderTree',
    'moveFolder'
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
      case 'getFolder':
      case 'getFolderTree':
        errors.push(...this.validateRef((params as any)?.ref, 'ref').errors);
        break;

      case 'createFolder':
        errors.push(...this.validateCreateFolderParams(params).errors);
        break;

      case 'updateFolder':
        errors.push(...this.validateUpdateFolderParams(params).errors);
        break;

      case 'moveFolder':
        errors.push(...this.validateMoveFolderParams(params).errors);
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
      case 'getFolder':
        return await this.getFolder(params as { ref: string }, context);

      case 'createFolder':
        return await this.createFolder(params as CreateFolderParams, context);

      case 'updateFolder':
        return await this.updateFolder(params as UpdateFolderParams, context);

      case 'getFolderTree':
        return await this.getFolderTree(params as { ref: string }, context);

      case 'moveFolder':
        return await this.moveFolder(params as MoveFolderParams, context);

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
        name: 'getFolder',
        description: 'Récupérer un dossier par son ID ou slug avec ses métadonnées',
        parameters: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'Référence du dossier (UUID ou slug)'
            }
          },
          required: ['ref']
        },
        handler: 'folders',
        operation: 'getFolder'
      },
      {
        name: 'createFolder',
        description: 'Créer un nouveau dossier dans un classeur',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              maxLength: 255,
              description: 'Nom du dossier'
            },
            classeur_id: {
              type: 'string',
              description: 'ID ou slug du classeur parent'
            },
            parent_folder_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID du dossier parent (optionnel, pour sous-dossiers)'
            },
            position: {
              type: 'number',
              minimum: 0,
              description: 'Position du dossier dans la hiérarchie (optionnel)'
            }
          },
          required: ['name', 'classeur_id']
        },
        handler: 'folders',
        operation: 'createFolder'
      },
      {
        name: 'updateFolder',
        description: 'Mettre à jour les métadonnées d\'un dossier',
        parameters: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'Référence du dossier (UUID ou slug)'
            },
            name: {
              type: 'string',
              maxLength: 255,
              description: 'Nouveau nom du dossier'
            },
            position: {
              type: 'number',
              minimum: 0,
              description: 'Nouvelle position du dossier'
            }
          },
          required: ['ref']
        },
        handler: 'folders',
        operation: 'updateFolder'
      },
      {
        name: 'getFolderTree',
        description: 'Récupérer l\'arbre hiérarchique complet d\'un dossier',
        parameters: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'Référence du dossier racine (UUID ou slug)'
            }
          },
          required: ['ref']
        },
        handler: 'folders',
        operation: 'getFolderTree'
      },
      {
        name: 'moveFolder',
        description: 'Déplacer un dossier vers un autre classeur ou dossier parent',
        parameters: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'Référence du dossier à déplacer (UUID ou slug)'
            },
            classeur_id: {
              type: 'string',
              description: 'ID ou slug du classeur de destination'
            },
            parent_folder_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID du dossier parent de destination (optionnel)'
            },
            position: {
              type: 'number',
              minimum: 0,
              description: 'Position dans le nouveau parent (optionnel)'
            }
          },
          required: ['ref']
        },
        handler: 'folders',
        operation: 'moveFolder'
      }
    ];
  }

  // ============================================================================
  // MÉTHODES DE VALIDATION SPÉCIFIQUES
  // ============================================================================

  private validateCreateFolderParams(params: unknown): ValidationResult {
    const p = params as CreateFolderParams;
    const errors: string[] = [];

    errors.push(...this.validateTitle(p.name, 'name').errors);
    errors.push(...this.validateRef(p.classeur_id, 'classeur_id').errors);

    if (p.parent_folder_id) {
      errors.push(...this.validateUUID(p.parent_folder_id, 'parent_folder_id').errors);
    }

    if (p.position !== undefined) {
      errors.push(...this.validatePositiveNumber(p.position, 'position').errors);
    }

    return { valid: errors.length === 0, errors };
  }

  private validateUpdateFolderParams(params: unknown): ValidationResult {
    const p = params as UpdateFolderParams;
    const errors: string[] = [];

    errors.push(...this.validateRef(p.ref, 'ref').errors);

    if (p.name) {
      errors.push(...this.validateTitle(p.name, 'name').errors);
    }

    if (p.position !== undefined) {
      errors.push(...this.validatePositiveNumber(p.position, 'position').errors);
    }

    return { valid: errors.length === 0, errors };
  }

  private validateMoveFolderParams(params: unknown): ValidationResult {
    const p = params as MoveFolderParams;
    const errors: string[] = [];

    errors.push(...this.validateRef(p.ref, 'ref').errors);

    if (!p.classeur_id && !p.parent_folder_id) {
      errors.push('Au moins un de classeur_id ou parent_folder_id doit être fourni');
    }

    if (p.classeur_id) {
      errors.push(...this.validateRef(p.classeur_id, 'classeur_id').errors);
    }

    if (p.parent_folder_id) {
      errors.push(...this.validateUUID(p.parent_folder_id, 'parent_folder_id').errors);
    }

    if (p.position !== undefined) {
      errors.push(...this.validatePositiveNumber(p.position, 'position').errors);
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // MÉTHODES D'IMPLÉMENTATION
  // ============================================================================

  private async getFolder(params: { ref: string }, context: ApiV2Context): Promise<Folder> {
    const resolution = await this.resolveRef(params.ref, 'folder', context.userId, context);
    if (!resolution.success || !resolution.id) {
      throw new Error(resolution.error || 'Dossier non trouvé');
    }

    const result = await V2DatabaseUtils.getFolder(resolution.id, context.userId, {
      operation: 'getFolder',
      component: 'FoldersHandler'
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erreur lors de la récupération du dossier');
    }

    return result.data;
  }

  private async createFolder(params: CreateFolderParams, context: ApiV2Context): Promise<Folder> {
    const result = await V2DatabaseUtils.createFolder(params, context.userId, {
      operation: 'createFolder',
      component: 'FoldersHandler'
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erreur lors de la création du dossier');
    }

    return result.data;
  }

  private async updateFolder(params: UpdateFolderParams, context: ApiV2Context): Promise<Folder> {
    const resolution = await this.resolveRef(params.ref, 'folder', context.userId, context);
    if (!resolution.success || !resolution.id) {
      throw new Error(resolution.error || 'Dossier non trouvé');
    }

    const result = await V2DatabaseUtils.updateFolder(resolution.id, params, context.userId, {
      operation: 'updateFolder',
      component: 'FoldersHandler'
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erreur lors de la mise à jour du dossier');
    }

    return result.data;
  }

  private async getFolderTree(params: { ref: string }, context: ApiV2Context): Promise<unknown> {
    const resolution = await this.resolveRef(params.ref, 'folder', context.userId, context);
    if (!resolution.success || !resolution.id) {
      throw new Error(resolution.error || 'Dossier non trouvé');
    }

    const result = await V2DatabaseUtils.getFolderTree(resolution.id, context.userId, {
      operation: 'getFolderTree',
      component: 'FoldersHandler'
    });

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la récupération de l\'arbre des dossiers');
    }

    return result.data || { folders: [], notes: [] };
  }

  private async moveFolder(params: MoveFolderParams, context: ApiV2Context): Promise<Folder> {
    const resolution = await this.resolveRef(params.ref, 'folder', context.userId, context);
    if (!resolution.success || !resolution.id) {
      throw new Error(resolution.error || 'Dossier non trouvé');
    }

    const result = await V2DatabaseUtils.moveFolder(resolution.id, params, context.userId, {
      operation: 'moveFolder',
      component: 'FoldersHandler'
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erreur lors du déplacement du dossier');
    }

    return result.data;
  }
}
