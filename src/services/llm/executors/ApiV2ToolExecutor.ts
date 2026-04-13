/**
 * ApiV2ToolExecutor - Version simplifiée et robuste
 * 100 lignes max, zéro switch case, générique
 */

import { ToolCall, ToolResult } from '../types/apiV2Types';
import { ApiV2HttpClient } from '../clients/ApiV2HttpClient';
import { simpleLogger as logger } from '@/utils/logger';
import { validateToolArgs } from '../validation/toolSchemas';
import { parseToolArgumentsSafe } from '../schemas';

/**
 * Type pour les handlers de tools
 */
type ToolHandler = (args: Record<string, unknown>, token: string) => Promise<unknown>;

/**
 * Exécuteur de tools simplifié
 * Utilise une approche générique au lieu d'un switch case géant
 */
export class ApiV2ToolExecutor {
  private readonly httpClient: ApiV2HttpClient;
  private readonly toolHandlers: Map<string, ToolHandler>;

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

      // Parser et valider les arguments avec Zod
      const args = this.parseArguments(func.arguments, func.name);
      
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
  private initializeToolHandlers(): Map<string, ToolHandler> {
    const handlers = new Map<string, ToolHandler>();

    // Notes
    handlers.set('createNote', (args: Record<string, unknown>, token: string) => this.httpClient.createNote(args, token));
    handlers.set('getNote', (args: Record<string, unknown>, token: string) => this.httpClient.getNote(args, token));
    handlers.set('updateNote', (args: Record<string, unknown>, token: string) => this.httpClient.updateNote(args.ref as string, args, token));
    handlers.set('moveNote', (args: Record<string, unknown>, token: string) => this.httpClient.moveNote(args.ref as string, args, token));
    handlers.set('insertNoteContent', (args: Record<string, unknown>, token: string) => this.httpClient.insertNoteContent(args.ref as string, args, token));
    handlers.set('applyContentOperations', (args: Record<string, unknown>, token: string) => this.httpClient.applyContentOperations(args.ref as string, args, token));
    handlers.set('editNoteSection', (args: Record<string, unknown>, token: string) => this.httpClient.editNoteSection(args.ref as string, args, token));
    handlers.set('getNoteTOC', (args: Record<string, unknown>, token: string) => this.httpClient.getNoteTOC(args.ref as string, token));
    handlers.set('getNoteShareSettings', (args: Record<string, unknown>, token: string) => this.httpClient.getNoteShareSettings(args.ref as string, token));
    handlers.set('updateNoteShareSettings', (args: Record<string, unknown>, token: string) => this.httpClient.updateNoteShareSettings(args.ref as string, args, token));
    handlers.set('getRecentNotes', (args: Record<string, unknown>, token: string) => this.httpClient.getRecentNotes(args, token));

    // Classeurs
    handlers.set('createClasseur', (args: Record<string, unknown>, token: string) => this.httpClient.createClasseur(args, token));
    handlers.set('getClasseur', (args: Record<string, unknown>, token: string) => this.httpClient.getClasseur(args, token));
    handlers.set('updateClasseur', (args: Record<string, unknown>, token: string) => this.httpClient.updateClasseur(args.ref as string, args, token));
    handlers.set('getClasseurTree', (args: Record<string, unknown>, token: string) => this.httpClient.getClasseurTree(args.ref as string, token));
    handlers.set('getClasseursWithContent', (args: Record<string, unknown>, token: string) => this.httpClient.getClasseursWithContent(token));
    handlers.set('listClasseurs', (args: Record<string, unknown>, token: string) => this.httpClient.listClasseurs(token));

    // Dossiers
    handlers.set('createFolder', (args: Record<string, unknown>, token: string) => this.httpClient.createFolder(args, token));
    handlers.set('getFolder', (args: Record<string, unknown>, token: string) => this.httpClient.getFolder(args, token));
    handlers.set('updateFolder', (args: Record<string, unknown>, token: string) => this.httpClient.updateFolder(args.ref as string, args, token));
    handlers.set('moveFolder', (args: Record<string, unknown>, token: string) => this.httpClient.moveFolder(args.ref as string, args, token));
    handlers.set('getFolderTree', (args: Record<string, unknown>, token: string) => this.httpClient.getFolderTree(args.ref as string, token));

    // Recherche
    handlers.set('searchContent', (args: Record<string, unknown>, token: string) => this.httpClient.searchContent(args, token));
    handlers.set('searchFiles', (args: Record<string, unknown>, token: string) => this.httpClient.searchFiles(args, token));

    // Autres
    handlers.set('getStats', (args: Record<string, unknown>, token: string) => this.httpClient.getStats(token));
    handlers.set('getUserProfile', (args: Record<string, unknown>, token: string) => this.httpClient.getUserProfile(token));
    handlers.set('getTrash', (args: Record<string, unknown>, token: string) => this.httpClient.getTrash(token));
    handlers.set('restoreFromTrash', (args: Record<string, unknown>, token: string) => this.httpClient.restoreFromTrash(args, token));
    handlers.set('purgeTrash', (args: Record<string, unknown>, token: string) => this.httpClient.purgeTrash(token));
    handlers.set('deleteResource', (args: Record<string, unknown>, token: string) => this.httpClient.deleteResource(args.resource as string, args.ref as string, token));

    // Canva sessions (REST V2)
    handlers.set('canva.create_session', (args: Record<string, unknown>, token: string) =>
      this.httpClient.createCanvaSession(args, token)
    );
    handlers.set('canva.list_sessions', (args: Record<string, unknown>, token: string) =>
      this.httpClient.listCanvaSessions(
        args.chat_session_id as string,
        args.statuses as string[] | null,
        token
      )
    );
    handlers.set('canva.get_session', (args: Record<string, unknown>, token: string) =>
      this.httpClient.getCanvaSession(args.session_id as string, token)
    );
    handlers.set('canva.update_session', (args: Record<string, unknown>, token: string) =>
      this.httpClient.updateCanvaSession(args.session_id as string, args, token)
    );
    handlers.set('canva.delete_session', (args: Record<string, unknown>, token: string) =>
      this.httpClient.deleteCanvaSession(args.session_id as string, token)
    );

    // Agents
    handlers.set('listAgents', (args: Record<string, unknown>, token: string) => this.httpClient.listAgents(token));
    handlers.set('createAgent', (args: Record<string, unknown>, token: string) => this.httpClient.createAgent(args, token));
    handlers.set('getAgent', (args: Record<string, unknown>, token: string) => this.httpClient.getAgent(args.agentId as string, token));
    handlers.set('executeAgent', (args: Record<string, unknown>, token: string) => {
      // Mapper les paramètres pour l'API V2
      const mappedArgs = {
        ref: (args.ref || args.agentId || args.agent_slug) as string,
        input: (args.input || args.message) as string
      };
      return this.httpClient.executeAgent(mappedArgs, token);
    });
    handlers.set('updateAgent', (args: Record<string, unknown>, token: string) => this.httpClient.updateAgent(args.agentId as string, args, token));
    handlers.set('patchAgent', (args: Record<string, unknown>, token: string) => this.httpClient.patchAgent(args.agentId as string, args, token));
    handlers.set('deleteAgent', (args: Record<string, unknown>, token: string) => this.httpClient.deleteAgent(args.agentId as string, token));

    // Classeurs - Opérations avancées
    handlers.set('reorderClasseurs', (args: Record<string, unknown>, token: string) => this.httpClient.reorderClasseurs(args, token));

    // Debug
    handlers.set('listTools', (args: Record<string, unknown>, token: string) => this.httpClient.listTools(token));
    handlers.set('debugInfo', (args: Record<string, unknown>, token: string) => this.httpClient.debugInfo(token));

    return handlers;
  }

  /**
   * Exécuter une fonction de tool
   * ✅ NAMESPACE: Support des noms préfixés (ex: scrivia__createNote)
   */
  private async executeToolFunction(
    functionName: string,
    args: Record<string, unknown>,
    userToken: string
  ): Promise<unknown> {
    // ✅ Chercher le handler (peut être préfixé ou non)
    let handler = this.toolHandlers.get(functionName);
    
    // Si pas trouvé avec le nom complet, essayer d'enlever le préfixe namespace
    if (!handler && functionName.includes('__')) {
      const parts = functionName.split('__');
      if (parts.length >= 2) {
        // Prendre tout après le premier '__' (au cas où il y a plusieurs __)
        const originalName = parts.slice(1).join('__');
        handler = this.toolHandlers.get(originalName);
        
        if (handler) {
          logger.dev(`[ApiV2ToolExecutor] 🔧 Handler trouvé avec nom original: ${originalName} (appelé via ${functionName})`);
        }
      }
    }
    
    if (!handler) {
      logger.error(`[ApiV2ToolExecutor] ❌ Tool non supporté: ${functionName}`);
      logger.error(`[ApiV2ToolExecutor] 📋 Tools disponibles:`, Array.from(this.toolHandlers.keys()).slice(0, 15));
      throw new Error(`Tool non supporté: ${functionName}`);
    }

    return await handler(args, userToken);
  }

  /**
   * Parser et valider les arguments JSON avec Zod
   * ✅ NAMESPACE: Enlève le préfixe avant validation (ex: scrivia__createNote → createNote)
   */
  private parseArguments(argumentsStr: string, toolName: string): Record<string, unknown> {
    try {
      // 1. Parser le JSON (robuste aux concaténations du stream)
      const parsed = parseToolArgumentsSafe(argumentsStr || '{}');
      
      // 2. Nettoyer les paramètres null
      const cleaned = this.cleanNullParameters(parsed);
      
      // 3. Enlever le préfixe namespace pour la validation Zod
      let toolNameForValidation = toolName;
      if (toolName.includes('__')) {
        const parts = toolName.split('__');
        if (parts.length >= 2) {
          toolNameForValidation = parts.slice(1).join('__');
          logger.dev(`[ApiV2ToolExecutor] 🔧 Validation avec nom original: ${toolNameForValidation} (appelé ${toolName})`);
        }
      }
      
      // 4. Valider avec Zod
      const validation = validateToolArgs(toolNameForValidation, cleaned);
      
      if (!validation.success) {
        if ('error' in validation) {
          // Extraire les erreurs de validation de manière lisible
          const errors = validation.error.errors.map(e => {
            const path = e.path.length > 0 ? `${e.path.join('.')}` : 'racine';
            return `${path}: ${e.message}`;
          }).join(', ');
          
          logger.error(`[ApiV2ToolExecutor] ❌ Validation Zod échouée pour ${toolName}:`, {
            errors: validation.error.errors,
            args: cleaned
          });
          
          throw new Error(`Arguments invalides pour ${toolName}: ${errors}`);
        }
        throw new Error(`Arguments invalides pour ${toolName}: validation inconnue`);
      }
      
      logger.dev(`[ApiV2ToolExecutor] ✅ Arguments validés pour ${toolName}`);
      
      // 4. Retourner les données validées et typées
      return validation.data as Record<string, unknown>;
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.error('[ApiV2ToolExecutor] ❌ JSON parse error:', error);
        throw new Error(`JSON invalide: ${error.message}`);
      }
      
      // Relancer l'erreur de validation Zod
      throw error;
    }
  }

  /**
   * Nettoie les paramètres null des arguments de tool call
   * L'API Groq ne supporte pas les valeurs null pour les paramètres de type string
   */
  private cleanNullParameters(args: unknown): Record<string, unknown> {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return {};
    }

    const cleaned: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
      // Si la valeur est null, undefined, ou une chaîne vide, on l'omet complètement
      if (value === null || value === undefined || value === '') {
        logger.dev(`[ApiV2ToolExecutor] 🧹 Suppression du paramètre invalide: ${key} = ${value}`);
        continue;
      }
      
      // Si c'est un objet, nettoyer récursivement
      if (value && typeof value === 'object' && !Array.isArray(value)) {
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