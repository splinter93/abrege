/**
 * ApiV2ToolExecutor - Version simplifiée et robuste
 * 100 lignes max, zéro switch case, générique
 */

import { ToolCall, ToolResult } from '../types/apiV2Types';
import { ApiV2HttpClient } from '../clients/ApiV2HttpClient';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Exécuteur de tools simplifié
 * Utilise une approche générique au lieu d'un switch case géant
 */
export class ApiV2ToolExecutor {
  private readonly httpClient: ApiV2HttpClient;
  private readonly toolHandlers: Map<string, Function>;

  constructor(httpClient?: ApiV2HttpClient) {
    this.httpClient = httpClient || new ApiV2HttpClient();
    this.toolHandlers = this.initializeToolHandlers();
  }

  /**
   * Exécuter un tool call
   */
  async executeToolCall(toolCall: ToolCall, userToken: string): Promise<ToolResult> {
    const { id, function: func } = toolCall;
    const startTime = Date.now();

    try {
      logger.info(`[ApiV2ToolExecutor] 🚀 Executing tool: ${func.name}`);

      // Parser les arguments
      const args = this.parseArguments(func.arguments);
      
      // Exécuter le tool
      const result = await this.executeToolFunction(func.name, args, userToken);

      const executionTime = Date.now() - startTime;
      logger.info(`[ApiV2ToolExecutor] ✅ Tool executed: ${func.name} (${executionTime}ms)`);

      return {
        tool_call_id: id,
        name: func.name,
        content: JSON.stringify(result),
        success: true
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[ApiV2ToolExecutor] ❌ Tool failed: ${func.name} (${executionTime}ms)`, error);

      return {
        tool_call_id: id,
        name: func.name,
        content: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur interne du serveur'
        }),
        success: false
      };
    }
  }

  /**
   * Initialiser les handlers de tools de manière générique
   */
  private initializeToolHandlers(): Map<string, Function> {
    const handlers = new Map<string, Function>();

    // Notes
    handlers.set('createNote', (args: any, token: string) => this.httpClient.createNote(args, token));
    handlers.set('getNote', (args: any, token: string) => this.httpClient.getNote(args, token));
    handlers.set('updateNote', (args: any, token: string) => this.httpClient.updateNote(args.ref, args, token));
    handlers.set('moveNote', (args: any, token: string) => this.httpClient.moveNote(args.ref, args, token));
    handlers.set('insertNoteContent', (args: any, token: string) => this.httpClient.insertNoteContent(args.ref, args, token));
    handlers.set('applyContentOperations', (args: any, token: string) => this.httpClient.applyContentOperations(args.ref, args, token));
    handlers.set('getNoteTOC', (args: any, token: string) => this.httpClient.getNoteTOC(args.ref, token));
    handlers.set('getNoteShareSettings', (args: any, token: string) => this.httpClient.getNoteShareSettings(args.ref, token));
    handlers.set('updateNoteShareSettings', (args: any, token: string) => this.httpClient.updateNoteShareSettings(args.ref, args, token));
    handlers.set('getRecentNotes', (args: any, token: string) => this.httpClient.getRecentNotes(args, token));

    // Classeurs
    handlers.set('createClasseur', (args: any, token: string) => this.httpClient.createClasseur(args, token));
    handlers.set('getClasseur', (args: any, token: string) => this.httpClient.getClasseur(args, token));
    handlers.set('updateClasseur', (args: any, token: string) => this.httpClient.updateClasseur(args.ref, args, token));
    handlers.set('getClasseurTree', (args: any, token: string) => this.httpClient.getClasseurTree(args.ref, token));
    handlers.set('getClasseursWithContent', (args: any, token: string) => this.httpClient.getClasseursWithContent(token));
    handlers.set('listClasseurs', (args: any, token: string) => this.httpClient.listClasseurs(token));

    // Dossiers
    handlers.set('createFolder', (args: any, token: string) => this.httpClient.createFolder(args, token));
    handlers.set('getFolder', (args: any, token: string) => this.httpClient.getFolder(args, token));
    handlers.set('updateFolder', (args: any, token: string) => this.httpClient.updateFolder(args.ref, args, token));
    handlers.set('moveFolder', (args: any, token: string) => this.httpClient.moveFolder(args.ref, args, token));
    handlers.set('getFolderTree', (args: any, token: string) => this.httpClient.getFolderTree(args.ref, token));

    // Recherche
    handlers.set('searchContent', (args: any, token: string) => this.httpClient.searchContent(args, token));
    handlers.set('searchFiles', (args: any, token: string) => this.httpClient.searchFiles(args, token));

    // Autres
    handlers.set('getStats', (args: any, token: string) => this.httpClient.getStats(token));
    handlers.set('getUserProfile', (args: any, token: string) => this.httpClient.getUserProfile(token));
    handlers.set('getTrash', (args: any, token: string) => this.httpClient.getTrash(token));
    handlers.set('restoreFromTrash', (args: any, token: string) => this.httpClient.restoreFromTrash(args, token));
    handlers.set('purgeTrash', (args: any, token: string) => this.httpClient.purgeTrash(token));
    handlers.set('deleteResource', (args: any, token: string) => this.httpClient.deleteResource(args.resource, args.ref, token));

    // Agents
    handlers.set('listAgents', (args: any, token: string) => this.httpClient.listAgents(token));
    handlers.set('createAgent', (args: any, token: string) => this.httpClient.createAgent(args, token));
    handlers.set('getAgent', (args: any, token: string) => this.httpClient.getAgent(args.agentId, token));
    handlers.set('executeAgent', (args: any, token: string) => {
      // Mapper les paramètres pour l'API V2
      const mappedArgs = {
        ref: args.ref || args.agentId || args.agent_slug,
        input: args.input || args.message
      };
      return this.httpClient.executeAgent(mappedArgs, token);
    });
    handlers.set('updateAgent', (args: any, token: string) => this.httpClient.updateAgent(args.agentId, args, token));
    handlers.set('patchAgent', (args: any, token: string) => this.httpClient.patchAgent(args.agentId, args, token));
    handlers.set('deleteAgent', (args: any, token: string) => this.httpClient.deleteAgent(args.agentId, token));

    // Notes - Opérations avancées
    handlers.set('applyContentOperations', (args: any, token: string) => this.httpClient.applyContentOperations(args.ref, args, token));
    handlers.set('insertNoteContent', (args: any, token: string) => this.httpClient.insertNoteContent(args.ref, args, token));
    handlers.set('getNoteTOC', (args: any, token: string) => this.httpClient.getNoteTOC(args.ref, token));
    handlers.set('getNoteShareSettings', (args: any, token: string) => this.httpClient.getNoteShareSettings(args.ref, token));
    handlers.set('updateNoteShareSettings', (args: any, token: string) => this.httpClient.updateNoteShareSettings(args.ref, args, token));

    // Classeurs - Opérations avancées
    handlers.set('reorderClasseurs', (args: any, token: string) => this.httpClient.reorderClasseurs(args, token));

    // Debug
    handlers.set('listTools', (args: any, token: string) => this.httpClient.listTools(token));
    handlers.set('debugInfo', (args: any, token: string) => this.httpClient.debugInfo(token));

    return handlers;
  }

  /**
   * Exécuter une fonction de tool
   */
  private async executeToolFunction(
    functionName: string,
    args: Record<string, unknown>,
    userToken: string
  ): Promise<unknown> {
    const handler = this.toolHandlers.get(functionName);
    
    if (!handler) {
      throw new Error(`Tool non supporté: ${functionName}`);
    }

    return await handler(args, userToken);
  }

  /**
   * Parser les arguments JSON
   */
  private parseArguments(argumentsStr: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(argumentsStr || '{}');
      
      // 🔧 CORRECTION: Nettoyer les paramètres null pour éviter les erreurs Groq
      return this.cleanNullParameters(parsed);
    } catch (error) {
      throw new Error('Arguments JSON invalides');
    }
  }

  /**
   * Nettoie les paramètres null des arguments de tool call
   * L'API Groq ne supporte pas les valeurs null pour les paramètres de type string
   */
  private cleanNullParameters(args: any): any {
    if (!args || typeof args !== 'object') {
      return args;
    }

    const cleaned: any = {};
    
    for (const [key, value] of Object.entries(args)) {
      // Si la valeur est null, undefined, ou une chaîne vide, on l'omet complètement
      if (value === null || value === undefined || value === '') {
        logger.dev(`[ApiV2ToolExecutor] 🧹 Suppression du paramètre invalide: ${key} = ${value}`);
        continue;
      }
      
      // Si c'est un objet, nettoyer récursivement
      if (value && typeof value === 'object') {
        cleaned[key] = this.cleanNullParameters(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    logger.dev(`[ApiV2ToolExecutor] 🧹 Arguments nettoyés:`, { original: args, cleaned });
    return cleaned;
  }

  /**
   * Vérifier si un tool est supporté
   */
  isToolSupported(functionName: string): boolean {
    return this.toolHandlers.has(functionName);
  }

  /**
   * Obtenir la liste des tools supportés
   */
  getSupportedTools(): string[] {
    return Array.from(this.toolHandlers.keys());
  }
}

// Instance singleton exportée
export const apiV2ToolExecutor = new ApiV2ToolExecutor();