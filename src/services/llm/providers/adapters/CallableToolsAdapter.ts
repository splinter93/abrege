/**
 * Adaptateur de callables Synesia pour providers non-Liminality
 * 
 * Convertit les callables Synesia en FunctionTool standard pour les providers
 * Groq, XAI, Cerebras, DeepSeek qui ne supportent pas nativement les callables.
 * 
 * Architecture :
 * - Callables → FunctionTool avec nom et description
 * - Préfixe `callable_` pour identification
 * - Paramètres basés sur input_schema du callable
 */

import type { FunctionTool } from '../../types/strictTypes';
import type { SynesiaCallable } from '@/types/callables';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Mapping entre tool name et callable ID
 */
export interface CallableToolMapping {
  toolName: string;
  callableId: string;
}

/**
 * Adaptateur de callables pour providers non-Liminality
 */
export class CallableToolsAdapter {
  /**
   * Convertit une liste de callables en FunctionTool pour les providers standard
   * 
   * @param callables - Liste des callables Synesia à convertir
   * @returns Liste de FunctionTool avec mapping toolName → callableId
   */
  static convertToFunctionTools(callables: SynesiaCallable[]): {
    tools: FunctionTool[];
    mapping: Map<string, string>;
  } {
    if (!callables || callables.length === 0) {
      return { tools: [], mapping: new Map() };
    }

    const tools: FunctionTool[] = [];
    const mapping = new Map<string, string>();

    for (const callable of callables) {
      try {
        // Validation des champs requis
        if (!callable.id || !callable.name) {
          logger.warn('[CallableToolsAdapter] ⚠️ Callable invalide ignoré:', {
            id: callable.id,
            name: callable.name
          });
          continue;
        }

        // Générer le nom du tool (sanitize + préfixe)
        const toolName = this.getToolName(callable);
        
        // Description avec fallback
        const description = callable.description || `Exécute le callable ${callable.name}`;

        // Construire les paramètres depuis input_schema
        const parameters = this.buildParametersFromSchema(callable.input_schema);

        // Créer le FunctionTool
        const tool: FunctionTool = {
          type: 'function',
          function: {
            name: toolName,
            description: description,
            parameters: parameters
          }
        };

        tools.push(tool);
        mapping.set(toolName, callable.id);

        logger.dev(`[CallableToolsAdapter] ✅ Callable converti: ${callable.name} → ${toolName}`);
      } catch (error) {
        logger.error('[CallableToolsAdapter] ❌ Erreur conversion callable:', {
          error: error instanceof Error ? error.message : String(error),
          callableId: callable.id,
          callableName: callable.name
        });
        // Continue avec les autres callables même si un échoue
      }
    }

    logger.info(`[CallableToolsAdapter] ✅ ${tools.length}/${callables.length} callables convertis en tools`);
    return { tools, mapping };
  }

  /**
   * Génère le nom du tool à partir d'un callable
   * 
   * @param callable - Callable Synesia
   * @returns Nom du tool sanitizé avec préfixe
   */
  static getToolName(callable: SynesiaCallable): string {
    if (!callable.name) {
      throw new Error('Callable doit avoir un nom');
    }

    // Sanitize : remplacer caractères spéciaux par underscore
    const sanitizedName = callable.name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();

    // Préfixe pour identification
    return `callable_${sanitizedName}`;
  }

  /**
   * Construit les paramètres du tool depuis input_schema
   * 
   * @param inputSchema - Schéma d'entrée du callable (peut être null ou invalide)
   * @returns Paramètres au format JSON Schema
   */
  private static buildParametersFromSchema(
    inputSchema: unknown | null
  ): FunctionTool['function']['parameters'] {
    // Schéma par défaut si input_schema est null ou invalide
    const defaultParameters: FunctionTool['function']['parameters'] = {
      type: 'object',
      properties: {
        args: {
          type: 'object',
          description: 'Arguments pour le callable',
          additionalProperties: true
        },
        settings: {
          type: 'object',
          description: 'Configuration optionnelle pour l\'exécution',
          additionalProperties: true
        }
      },
      required: []
    };

    if (!inputSchema || typeof inputSchema !== 'object') {
      return defaultParameters;
    }

    try {
      const schema = inputSchema as Record<string, unknown>;

      // Si le schéma a déjà la structure attendue
      if (schema.type === 'object' && schema.properties) {
        return {
          type: 'object',
          properties: schema.properties as Record<string, {
            type: string;
            description?: string;
            [key: string]: unknown;
          }>,
          required: Array.isArray(schema.required) ? schema.required as string[] : [],
          additionalProperties: schema.additionalProperties !== false
        };
      }

      // Sinon, wrapper dans args
      return {
        type: 'object',
        properties: {
          args: {
            type: 'object',
            description: 'Arguments pour le callable',
            properties: schema.properties as Record<string, unknown> | undefined,
            additionalProperties: true
          },
          settings: {
            type: 'object',
            description: 'Configuration optionnelle pour l\'exécution',
            additionalProperties: true
          }
        },
        required: []
      };
    } catch (error) {
      logger.warn('[CallableToolsAdapter] ⚠️ Erreur parsing input_schema, utilisation du schéma par défaut:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return defaultParameters;
    }
  }

  /**
   * Valide qu'un callable peut être converti en tool
   * 
   * @param callable - Callable à valider
   * @returns true si valide, false sinon
   */
  static validateCallable(callable: SynesiaCallable): boolean {
    if (!callable || !callable.id || !callable.name) {
      return false;
    }

    // Vérifier que l'ID est un UUID valide (format basique)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(callable.id)) {
      logger.warn('[CallableToolsAdapter] ⚠️ Callable ID invalide (pas un UUID):', callable.id);
      return false;
    }

    return true;
  }

  /**
   * Filtre les callables invalides d'une liste
   * 
   * @param callables - Liste de callables à filtrer
   * @returns Liste de callables valides uniquement
   */
  static filterValidCallables(callables: SynesiaCallable[]): SynesiaCallable[] {
    const valid = callables.filter(callable => this.validateCallable(callable));
    
    if (valid.length < callables.length) {
      logger.warn(`[CallableToolsAdapter] ⚠️ ${callables.length - valid.length} callables invalides filtrés`);
    }
    
    return valid;
  }
}
