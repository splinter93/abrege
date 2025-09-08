/**
 * Handler pour toutes les opérations liées aux classeurs
 * Implémentation stricte et production-ready des 5 opérations classeurs
 */

import { BaseHandlerImpl } from '../core/BaseHandler';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { simpleLogger as logger } from '@/utils/logger';
import type {
  ValidationResult,
  ToolDefinition,
  ApiV2Context,
  CreateClasseurParams,
  UpdateClasseurParams,
  ReorderClasseursParams,
  Classeur
} from '../types/ApiV2Types';

export class ClasseursHandler extends BaseHandlerImpl {
  readonly name = 'classeurs';
  readonly supportedOperations = [
    'listClasseurs',
    'createClasseur',
    'getClasseur',
    'updateClasseur',
    'getClasseurTree',
    'reorderClasseurs'
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
      case 'listClasseurs':
        // Pas de paramètres requis pour listClasseurs
        break;

      case 'getClasseur':
      case 'getClasseurTree':
        errors.push(...this.validateRef((params as any)?.ref, 'ref').errors);
        break;

      case 'createClasseur':
        errors.push(...this.validateCreateClasseurParams(params).errors);
        break;

      case 'updateClasseur':
        errors.push(...this.validateUpdateClasseurParams(params).errors);
        break;

      case 'reorderClasseurs':
        errors.push(...this.validateReorderClasseursParams(params).errors);
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
      case 'listClasseurs':
        return await this.listClasseurs(params as { limit?: number; offset?: number }, context);

      case 'getClasseur':
        return await this.getClasseur(params as { ref: string }, context);

      case 'createClasseur':
        return await this.createClasseur(params as CreateClasseurParams, context);

      case 'updateClasseur':
        return await this.updateClasseur(params as UpdateClasseurParams, context);

      case 'getClasseurTree':
        return await this.getClasseurTree(params as { ref: string }, context);

      case 'reorderClasseurs':
        return await this.reorderClasseurs(params as ReorderClasseursParams, context);

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
        name: 'listClasseurs',
        description: 'Lister tous les classeurs de l\'utilisateur',
        parameters: {
          type: 'object',
          properties: {}
        },
        handler: 'classeurs',
        operation: 'listClasseurs'
      },
      {
        name: 'getClasseur',
        description: 'Récupérer un classeur par son ID ou slug avec ses métadonnées',
        parameters: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'Référence du classeur (UUID ou slug)'
            }
          },
          required: ['ref']
        },
        handler: 'classeurs',
        operation: 'getClasseur'
      },
      {
        name: 'createClasseur',
        description: 'Créer un nouveau classeur pour organiser les notes',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              maxLength: 255,
              description: 'Nom du classeur'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Description du classeur (optionnel)'
            },
            color: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              description: 'Couleur du classeur au format hexadécimal (optionnel)'
            },
            position: {
              type: 'number',
              minimum: 0,
              description: 'Position du classeur dans la liste (optionnel)'
            }
          },
          required: ['name']
        },
        handler: 'classeurs',
        operation: 'createClasseur'
      },
      {
        name: 'updateClasseur',
        description: 'Mettre à jour les métadonnées d\'un classeur',
        parameters: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'Référence du classeur (UUID ou slug)'
            },
            name: {
              type: 'string',
              maxLength: 255,
              description: 'Nouveau nom du classeur'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Nouvelle description du classeur'
            },
            color: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
              description: 'Nouvelle couleur du classeur'
            },
            position: {
              type: 'number',
              minimum: 0,
              description: 'Nouvelle position du classeur'
            }
          },
          required: ['ref']
        },
        handler: 'classeurs',
        operation: 'updateClasseur'
      },
      {
        name: 'getClasseurTree',
        description: 'Récupérer l\'arbre hiérarchique complet d\'un classeur (dossiers et notes)',
        parameters: {
          type: 'object',
          properties: {
            ref: {
              type: 'string',
              description: 'Référence du classeur (UUID ou slug)'
            }
          },
          required: ['ref']
        },
        handler: 'classeurs',
        operation: 'getClasseurTree'
      },
      {
        name: 'reorderClasseurs',
        description: 'Réorganiser l\'ordre des classeurs',
        parameters: {
          type: 'object',
          properties: {
            classeur_orders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  classeur_id: {
                    type: 'string',
                    description: 'ID du classeur'
                  },
                  position: {
                    type: 'number',
                    minimum: 0,
                    description: 'Nouvelle position du classeur'
                  }
                },
                required: ['classeur_id', 'position']
              },
              description: 'Liste des classeurs avec leurs nouvelles positions'
            }
          },
          required: ['classeur_orders']
        },
        handler: 'classeurs',
        operation: 'reorderClasseurs'
      }
    ];
  }

  // ============================================================================
  // MÉTHODES DE VALIDATION SPÉCIFIQUES
  // ============================================================================


  private validateCreateClasseurParams(params: unknown): ValidationResult {
    const p = params as CreateClasseurParams;
    const errors: string[] = [];

    errors.push(...this.validateTitle(p.name, 'name').errors);

    if (p.description) {
      errors.push(...this.validateString(p.description, 'description', false, 1000).errors);
    }

    if (p.color && !/^#[0-9A-Fa-f]{6}$/.test(p.color)) {
      errors.push('color doit être au format hexadécimal (#RRGGBB)');
    }

    if (p.position !== undefined) {
      errors.push(...this.validatePositiveNumber(p.position, 'position').errors);
    }

    return { valid: errors.length === 0, errors };
  }

  private validateUpdateClasseurParams(params: unknown): ValidationResult {
    const p = params as UpdateClasseurParams;
    const errors: string[] = [];

    errors.push(...this.validateRef(p.ref, 'ref').errors);

    if (p.name) {
      errors.push(...this.validateTitle(p.name, 'name').errors);
    }

    if (p.description) {
      errors.push(...this.validateString(p.description, 'description', false, 1000).errors);
    }

    if (p.color && !/^#[0-9A-Fa-f]{6}$/.test(p.color)) {
      errors.push('color doit être au format hexadécimal (#RRGGBB)');
    }

    if (p.position !== undefined) {
      errors.push(...this.validatePositiveNumber(p.position, 'position').errors);
    }

    return { valid: errors.length === 0, errors };
  }

  private validateReorderClasseursParams(params: unknown): ValidationResult {
    const p = params as ReorderClasseursParams;
    const errors: string[] = [];

    if (!Array.isArray(p.classeur_orders) || p.classeur_orders.length === 0) {
      errors.push('classeur_orders doit être un tableau non vide');
    } else {
      p.classeur_orders.forEach((order, index) => {
        if (!order.classeur_id || typeof order.classeur_id !== 'string') {
          errors.push(`classeur_orders[${index}].classeur_id est requis et doit être une chaîne`);
        }
        if (typeof order.position !== 'number' || order.position < 0) {
          errors.push(`classeur_orders[${index}].position doit être un nombre positif`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // MÉTHODES D'IMPLÉMENTATION
  // ============================================================================

  private async listClasseurs(
    params: {},
    context: ApiV2Context
  ): Promise<Classeur[]> {
    // FORCER L'AFFICHAGE DU LOG
    console.error(`🚨🚨🚨 [FORCE DEBUG] ClasseursHandler.listClasseurs appelé avec userId: ${context.userId} 🚨🚨🚨`);
    console.log(`🔍 [DEBUG] ClasseursHandler.listClasseurs appelé avec userId: ${context.userId}`);
    
    const result = await V2DatabaseUtils.getClasseurs(
      context.userId,
      {
        operation: 'listClasseurs',
        component: 'ClasseursHandler'
      }
    );

    console.error(`🚨🚨🚨 [FORCE DEBUG] Résultat V2DatabaseUtils.getClasseurs:`, JSON.stringify(result, null, 2), `🚨🚨🚨`);
    console.log(`🔍 [DEBUG] Résultat V2DatabaseUtils.getClasseurs:`, JSON.stringify(result, null, 2));

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la récupération des classeurs');
    }

    const classeurs = result.data || [];
    console.error(`🚨🚨🚨 [FORCE DEBUG] Classeurs retournés:`, classeurs.length, classeurs, `🚨🚨🚨`);
    console.log(`🔍 [DEBUG] Classeurs retournés:`, classeurs.length, classeurs);
    
    return classeurs;
  }

  private async getClasseur(params: { ref: string }, context: ApiV2Context): Promise<Classeur> {
    const resolution = await this.resolveRef(params.ref, 'classeur', context.userId, context);
    if (!resolution.success || !resolution.id) {
      throw new Error(resolution.error || 'Classeur non trouvé');
    }

    const result = await V2DatabaseUtils.getClasseur(resolution.id, context.userId, {
      operation: 'getClasseur',
      component: 'ClasseursHandler'
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erreur lors de la récupération du classeur');
    }

    return result.data;
  }

  private async createClasseur(params: CreateClasseurParams, context: ApiV2Context): Promise<Classeur> {
    const result = await V2DatabaseUtils.createClasseur(params, context.userId, {
      operation: 'createClasseur',
      component: 'ClasseursHandler'
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erreur lors de la création du classeur');
    }

    return result.data;
  }

  private async updateClasseur(params: UpdateClasseurParams, context: ApiV2Context): Promise<Classeur> {
    const resolution = await this.resolveRef(params.ref, 'classeur', context.userId, context);
    if (!resolution.success || !resolution.id) {
      throw new Error(resolution.error || 'Classeur non trouvé');
    }

    const result = await V2DatabaseUtils.updateClasseur(resolution.id, params, context.userId, {
      operation: 'updateClasseur',
      component: 'ClasseursHandler'
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Erreur lors de la mise à jour du classeur');
    }

    return result.data;
  }

  private async getClasseurTree(params: { ref: string }, context: ApiV2Context): Promise<unknown> {
    const resolution = await this.resolveRef(params.ref, 'classeur', context.userId, context);
    if (!resolution.success || !resolution.id) {
      throw new Error(resolution.error || 'Classeur non trouvé');
    }

    const result = await V2DatabaseUtils.getClasseurTree(resolution.id, context.userId, {
      operation: 'getClasseurTree',
      component: 'ClasseursHandler'
    });

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la récupération de l\'arbre du classeur');
    }

    return result.data || { dossiers: [], notes: [] };
  }

  private async reorderClasseurs(params: ReorderClasseursParams, context: ApiV2Context): Promise<unknown> {
    const result = await V2DatabaseUtils.reorderClasseurs(params, context.userId, {
      operation: 'reorderClasseurs',
      component: 'ClasseursHandler'
    });

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la réorganisation des classeurs');
    }

    return {
      success: true,
      message: 'Classeurs réorganisés avec succès',
      reordered_count: params.classeur_orders.length
    };
  }
}
