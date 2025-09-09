/**
 * Exécuteur de tools TypeScript strict pour l'API V2
 * Appels HTTP directs, zéro any, parfaitement fidèle aux endpoints
 */

import { ToolCall, ToolResult } from '../types/apiV2Types';
import { ApiV2HttpClient } from '../clients/ApiV2HttpClient';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Exécuteur de tools avec appels HTTP directs vers l'API V2
 * Chaque tool correspond exactement à un endpoint
 */
export class ApiV2ToolExecutor {
  private readonly httpClient: ApiV2HttpClient;

  constructor(httpClient?: ApiV2HttpClient) {
    this.httpClient = httpClient || new ApiV2HttpClient();
  }

  /**
   * Exécuter un tool call via l'API V2
   */
  async executeToolCall(toolCall: ToolCall, userToken: string): Promise<ToolResult> {
    const startTime = Date.now();
    const { id, function: func } = toolCall;

    try {
      logger.info(`[ApiV2ToolExecutor] 🚀 Exécution tool: ${func.name}`, {
        toolCallId: id,
        functionName: func.name,
        hasArguments: !!func.arguments
      });

      // Parser les arguments
      const args = this.parseArguments(func.arguments);
      
      // Exécuter le tool correspondant
      const result = await this.executeToolFunction(func.name, args, userToken);

      const executionTime = Date.now() - startTime;
      logger.info(`[ApiV2ToolExecutor] ✅ Tool exécuté: ${func.name}`, {
        toolCallId: id,
        functionName: func.name,
        executionTime,
        success: true
      });

      return {
        tool_call_id: id,
        name: func.name,
        content: JSON.stringify(result),
        success: true
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[ApiV2ToolExecutor] ❌ Erreur tool ${func.name}:`, {
        toolCallId: id,
        functionName: func.name,
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        tool_call_id: id,
        name: func.name,
        content: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur interne du serveur',
          code: 'TOOL_EXECUTION_ERROR'
        }),
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        code: 'TOOL_EXECUTION_ERROR'
      };
    }
  }

  /**
   * Parser les arguments JSON d'un tool call
   */
  private parseArguments(argumentsStr: string): Record<string, unknown> {
    try {
      return JSON.parse(argumentsStr || '{}');
    } catch (error) {
      logger.warn(`[ApiV2ToolExecutor] ⚠️ Arguments JSON invalides:`, {
        arguments: argumentsStr,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('Arguments JSON invalides');
    }
  }

  /**
   * Exécuter une fonction de tool spécifique
   */
  private async executeToolFunction(
    functionName: string,
    args: Record<string, unknown>,
    userToken: string
  ): Promise<unknown> {
    switch (functionName) {
      // ============================================================================
      // TOOLS POUR LES NOTES
      // ============================================================================

      case 'createNote':
        return await this.httpClient.createNote(args, userToken);

      case 'getNote':
        return await this.httpClient.getNote(args, userToken);

      case 'updateNote':
        return await this.httpClient.updateNote(args.ref as string, args, userToken);

      case 'moveNote':
        return await this.httpClient.moveNote(args.ref as string, args, userToken);

      case 'insertNoteContent':
        return await this.httpClient.insertNoteContent(args.ref as string, args, userToken);

      case 'applyContentOperations':
        return await this.httpClient.applyContentOperations(args.ref as string, args, userToken);

      case 'getNoteTOC':
        return await this.httpClient.getNoteTOC(args.ref as string, userToken);

      case 'getNoteShareSettings':
        return await this.httpClient.getNoteShareSettings(args.ref as string, userToken);

      case 'updateNoteShareSettings':
        return await this.httpClient.updateNoteShareSettings(args.ref as string, args, userToken);

      case 'getRecentNotes':
        return await this.httpClient.getRecentNotes(args, userToken);

      // ============================================================================
      // TOOLS POUR LES CLASSEURS
      // ============================================================================

      case 'createClasseur':
        return await this.httpClient.createClasseur(args, userToken);

      case 'getClasseur':
        return await this.httpClient.getClasseur(args, userToken);

      case 'updateClasseur':
        return await this.httpClient.updateClasseur(args.ref as string, args, userToken);

      case 'getClasseurTree':
        return await this.httpClient.getClasseurTree(args.ref as string, userToken);

      case 'getClasseursWithContent':
        return await this.httpClient.getClasseursWithContent(userToken);

      case 'listClasseurs':
        return await this.httpClient.listClasseurs(userToken);

      // ============================================================================
      // TOOLS POUR LES DOSSIERS
      // ============================================================================

      case 'createFolder':
        return await this.httpClient.createFolder(args, userToken);

      case 'getFolder':
        return await this.httpClient.getFolder(args, userToken);

      case 'updateFolder':
        return await this.httpClient.updateFolder(args.ref as string, args, userToken);

      case 'moveFolder':
        return await this.httpClient.moveFolder(args.ref as string, args, userToken);

      case 'getFolderTree':
        return await this.httpClient.getFolderTree(args.ref as string, userToken);

      // ============================================================================
      // TOOLS POUR LA RECHERCHE
      // ============================================================================

      case 'searchContent':
        return await this.httpClient.searchContent(args, userToken);

      case 'searchFiles':
        return await this.httpClient.searchFiles(args, userToken);

      // ============================================================================
      // TOOLS POUR LES STATISTIQUES
      // ============================================================================

      case 'getStats':
        return await this.httpClient.getStats(userToken);

      // ============================================================================
      // TOOLS POUR LE PROFIL UTILISATEUR
      // ============================================================================

      case 'getUserProfile':
        return await this.httpClient.getUserProfile(userToken);

      // ============================================================================
      // TOOLS POUR LA CORBEILLE
      // ============================================================================

      case 'getTrash':
        return await this.httpClient.getTrash(userToken);

      case 'restoreFromTrash':
        return await this.httpClient.restoreFromTrash(args, userToken);

      case 'purgeTrash':
        return await this.httpClient.purgeTrash(userToken);

      // ============================================================================
      // TOOLS POUR LA SUPPRESSION
      // ============================================================================

      case 'deleteResource':
        return await this.httpClient.deleteResource(
          args.resource as 'note' | 'folder' | 'classeur',
          args.ref as string,
          userToken
        );

      // ============================================================================
      // TOOL NON SUPPORTÉ
      // ============================================================================

      default:
        throw new Error(`Tool non supporté: ${functionName}`);
    }
  }

  /**
   * Vérifier si un tool est supporté
   */
  isToolSupported(functionName: string): boolean {
    const supportedTools = [
      // Notes
      'createNote', 'getNote', 'updateNote', 'moveNote', 'insertNoteContent',
      'applyContentOperations', 'getNoteTOC', 'getNoteShareSettings',
      'updateNoteShareSettings', 'getRecentNotes',
      
      // Classeurs
      'createClasseur', 'getClasseur', 'updateClasseur', 'getClasseurTree',
      'getClasseursWithContent', 'listClasseurs',
      
      // Dossiers
      'createFolder', 'getFolder', 'updateFolder', 'moveFolder', 'getFolderTree',
      
      // Recherche
      'searchContent', 'searchFiles',
      
      // Statistiques
      'getStats',
      
      // Profil utilisateur
      'getUserProfile',
      
      // Corbeille
      'getTrash', 'restoreFromTrash', 'purgeTrash',
      
      // Suppression
      'deleteResource'
    ];

    return supportedTools.includes(functionName);
  }

  /**
   * Obtenir la liste des tools supportés
   */
  getSupportedTools(): string[] {
    return [
      // Notes
      'createNote', 'getNote', 'updateNote', 'moveNote', 'insertNoteContent',
      'applyContentOperations', 'getNoteTOC', 'getNoteShareSettings',
      'updateNoteShareSettings', 'getRecentNotes',
      
      // Classeurs
      'createClasseur', 'getClasseur', 'updateClasseur', 'getClasseurTree',
      'getClasseursWithContent', 'listClasseurs',
      
      // Dossiers
      'createFolder', 'getFolder', 'updateFolder', 'moveFolder', 'getFolderTree',
      
      // Recherche
      'searchContent', 'searchFiles',
      
      // Statistiques
      'getStats',
      
      // Profil utilisateur
      'getUserProfile',
      
      // Corbeille
      'getTrash', 'restoreFromTrash', 'purgeTrash',
      
      // Suppression
      'deleteResource'
    ];
  }
}

// Instance singleton exportée
export const apiV2ToolExecutor = new ApiV2ToolExecutor();
