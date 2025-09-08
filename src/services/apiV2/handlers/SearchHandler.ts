/**
 * Handler pour toutes les opérations de recherche
 * Implémentation stricte et production-ready des 2 opérations de recherche
 */

import { BaseHandlerImpl } from '../core/BaseHandler';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { simpleLogger as logger } from '@/utils/logger';
import type {
  ValidationResult,
  ToolDefinition,
  ApiV2Context,
  SearchContentParams,
  SearchFilesParams,
  SearchResult
} from '../types/ApiV2Types';

export class SearchHandler extends BaseHandlerImpl {
  readonly name = 'search';
  readonly supportedOperations = [
    'searchContent',
    'searchFiles'
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
      case 'searchContent':
        errors.push(...this.validateSearchContentParams(params).errors);
        break;

      case 'searchFiles':
        errors.push(...this.validateSearchFilesParams(params).errors);
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
      case 'searchContent':
        return await this.searchContent(params as SearchContentParams, context);

      case 'searchFiles':
        return await this.searchFiles(params as SearchFilesParams, context);

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
        name: 'searchContent',
        description: 'Rechercher du contenu dans les notes, dossiers et classeurs',
        parameters: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              minLength: 1,
              description: 'Terme de recherche'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Nombre maximum de résultats à retourner'
            },
            offset: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Nombre de résultats à ignorer (pour la pagination)'
            },
            type: {
              type: 'string',
              enum: ['all', 'notes', 'classeurs', 'files'],
              description: 'Type de contenu à rechercher (optionnel)'
            }
          },
          required: ['q']
        },
        handler: 'search',
        operation: 'searchContent'
      },
      {
        name: 'searchFiles',
        description: 'Rechercher des fichiers par nom, type ou contenu',
        parameters: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              minLength: 1,
              description: 'Terme de recherche'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Nombre maximum de résultats à retourner'
            },
            offset: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Nombre de résultats à ignorer (pour la pagination)'
            },
            file_type: {
              type: 'string',
              description: 'Type de fichier à rechercher (ex: image, pdf, doc)'
            }
          },
          required: ['q']
        },
        handler: 'search',
        operation: 'searchFiles'
      }
    ];
  }

  // ============================================================================
  // MÉTHODES DE VALIDATION SPÉCIFIQUES
  // ============================================================================

  private validateSearchContentParams(params: unknown): ValidationResult {
    const p = params as SearchContentParams;
    const errors: string[] = [];

    // Validation de la requête
    if (!p.q || typeof p.q !== 'string' || p.q.trim().length === 0) {
      errors.push('q est requis et doit être une chaîne non vide');
    } else if (p.q.length < 2) {
      errors.push('q doit contenir au moins 2 caractères');
    }

    // Validation de la limite
    if (p.limit !== undefined) {
      errors.push(...this.validatePositiveNumber(p.limit, 'limit', 1, 100).errors);
    }

    // Validation de l'offset
    if (p.offset !== undefined) {
      errors.push(...this.validatePositiveNumber(p.offset, 'offset').errors);
    }

    // Validation du type
    if (p.type && !['all', 'notes', 'classeurs', 'files'].includes(p.type)) {
      errors.push('type doit être all, notes, classeurs ou files');
    }

    return { valid: errors.length === 0, errors };
  }

  private validateSearchFilesParams(params: unknown): ValidationResult {
    const p = params as SearchFilesParams;
    const errors: string[] = [];

    // Validation de la requête
    if (!p.q || typeof p.q !== 'string' || p.q.trim().length === 0) {
      errors.push('q est requis et doit être une chaîne non vide');
    } else if (p.q.length < 2) {
      errors.push('q doit contenir au moins 2 caractères');
    }

    // Validation de la limite
    if (p.limit !== undefined) {
      errors.push(...this.validatePositiveNumber(p.limit, 'limit', 1, 100).errors);
    }

    // Validation de l'offset
    if (p.offset !== undefined) {
      errors.push(...this.validatePositiveNumber(p.offset, 'offset').errors);
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // MÉTHODES D'IMPLÉMENTATION
  // ============================================================================

  private async searchContent(params: SearchContentParams, context: ApiV2Context): Promise<SearchResult[]> {
    // Déterminer le type de recherche basé sur le paramètre type
    const searchType = params.type || 'all';
    
    let result;
    
    switch (searchType) {
      case 'notes':
      case 'all':
        // Recherche dans les notes
        result = await V2DatabaseUtils.searchNotes(
          params.q,
          params.limit || 20,
          params.offset || 0,
          context.userId,
          {
            operation: 'searchContent',
            component: 'SearchHandler'
          }
        );
        break;
        
      case 'classeurs':
        // Recherche dans les classeurs
        result = await V2DatabaseUtils.searchClasseurs(
          params.q,
          params.limit || 20,
          params.offset || 0,
          context.userId,
          {
            operation: 'searchContent',
            component: 'SearchHandler'
          }
        );
        break;
        
      case 'files':
        // Recherche dans les fichiers
        result = await V2DatabaseUtils.searchFiles(
          params.q,
          params.limit || 20,
          params.offset || 0,
          context.userId,
          {
            operation: 'searchContent',
            component: 'SearchHandler'
          }
        );
        break;
        
      default:
        throw new Error(`Type de recherche non supporté: ${searchType}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la recherche de contenu');
    }

    // Transformer les résultats pour correspondre au type SearchResult
    const searchResults: SearchResult[] = (result.data || []).map((item: any) => ({
      id: item.id,
      type: searchType === 'classeurs' ? 'classeur' as const : 
            searchType === 'files' ? 'file' as const : 'note' as const,
      title: item.source_title || item.title || item.name || 'Sans titre',
      content: item.content || item.markdown_content || item.description || '',
      relevance_score: item.relevance_score || 0.5,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    return searchResults;
  }

  private async searchFiles(params: SearchFilesParams, context: ApiV2Context): Promise<unknown> {
    const result = await V2DatabaseUtils.searchFiles(
      params.q,
      params.limit || 20,
      params.offset || 0,
      context.userId,
      {
        operation: 'searchFiles',
        component: 'SearchHandler'
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la recherche de fichiers');
    }

    return {
      success: true,
      results: result.data || [],
      total: result.data?.length || 0,
      query: params.q,
      filters: {
        file_type: params.file_type
      }
    };
  }
}
