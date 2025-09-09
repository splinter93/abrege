import { simpleLogger as logger } from '@/utils/logger';

export interface OpenApiToolResult {
  tool_call_id: string;
  name: string;
  result: any;
  success: boolean;
  timestamp: string;
}

/**
 * Service d'exécution des tools OpenAPI V2
 * Remplace l'ancien système agentApiV2Tools pour l'exécution des tools
 */
export class OpenApiToolExecutor {
  private static instance: OpenApiToolExecutor;
  
  // Historique des IDs déjà exécutés (évite la double exécution)
  private executedCallIds: Set<string> = new Set();

  private constructor() {
    // ✅ CORRECTION: Ne pas initialiser Supabase ici car on utilise le token utilisateur
    // Le token utilisateur sera passé directement aux appels API
  }

  static getInstance(): OpenApiToolExecutor {
    if (!OpenApiToolExecutor.instance) {
      OpenApiToolExecutor.instance = new OpenApiToolExecutor();
    }
    return OpenApiToolExecutor.instance;
  }

  /**
   * Exécuter un tool call OpenAPI V2
   */
  async executeToolCall(
    toolCall: any,
    userToken: string,
    maxRetries: number = 3,
    options?: { batchId?: string }
  ): Promise<OpenApiToolResult> {
    const { id, function: func } = toolCall;
    
    if (!func?.name) {
      throw new Error('Tool call invalide: nom de fonction manquant');
    }

    // Empêcher la double exécution du même tool_call_id
    if (this.executedCallIds.has(id)) {
      logger.warn(`[OpenApiToolExecutor] ⚠️ Tool call ${id} déjà exécuté - évitement de double exécution`);
      return {
        tool_call_id: id,
        name: func.name,
        result: { success: false, error: 'Tool call déjà exécuté' },
        success: false,
        timestamp: new Date().toISOString()
      };
    }

    // Marquer comme exécuté
    this.executedCallIds.add(id);

    // Nettoyer l'ID après 5 minutes
    setTimeout(() => {
      this.executedCallIds.delete(id);
    }, 5 * 60 * 1000);

    try {
      const args = this.parseArguments(func.arguments);
      logger.info(`[OpenApiToolExecutor] 🔧 Exécution de ${func.name}...`);

      // Exécuter le tool avec timeout raisonnable
      const toolCallPromise = this.executeOpenApiTool(func.name, args, userToken);
      const timeoutPromise = new Promise((resolve) => { 
        setTimeout(() => resolve({ success: false, error: 'Timeout tool call (10s)' }), 15000); 
      });
      const rawResult = await Promise.race([toolCallPromise, timeoutPromise]);

      // Normaliser le résultat
      const normalized = this.normalizeResult(rawResult, func.name, args);
      logger.info(`[OpenApiToolExecutor] ✅ Tool ${func.name} exécuté avec succès`);

      return {
        tool_call_id: id,
        name: func.name,
        result: normalized,
        success: normalized.success !== false && !normalized.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`[OpenApiToolExecutor] ❌ Erreur exécution ${func.name}:`, error);
      
      return {
        tool_call_id: id,
        name: func.name,
        result: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erreur inconnue' 
        },
        success: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Exécuter un tool OpenAPI V2 spécifique
   */
  private async executeOpenApiTool(toolName: string, args: any, userToken: string): Promise<any> {
    // 🔧 CORRECTION: Mapper les noms OpenAPI (camelCase) vers les endpoints API v2
    const endpointMapping: Record<string, { method: string; path: string }> = {
      // Notes
      'createNote': { method: 'POST', path: '/api/v2/note/create' },
      'getNote': { method: 'GET', path: `/api/v2/note/${args.ref}` },
      'updateNote': { method: 'PATCH', path: `/api/v2/note/${args.ref}/update` },
      'insertNoteContent': { method: 'PATCH', path: `/api/v2/note/${args.ref}/insert-content` },
      'applyContentOperations': { method: 'POST', path: `/api/v2/note/${args.ref}/content:apply` },
      'moveNote': { method: 'PUT', path: `/api/v2/note/${args.ref}/move` },
      'getNoteTOC': { method: 'GET', path: `/api/v2/note/${args.ref}/table-of-contents` },
      'getNoteShareSettings': { method: 'GET', path: `/api/v2/note/${args.ref}/share` },
      'updateNoteShareSettings': { method: 'PUT', path: `/api/v2/note/${args.ref}/share` },
      'getRecentNotes': { method: 'GET', path: '/api/v2/note/recent' },
      
      // Classeurs
      'createClasseur': { method: 'POST', path: '/api/v2/classeur/create' },
      'getClasseur': { method: 'GET', path: `/api/v2/classeur/${args.ref}` },
      'updateClasseur': { method: 'PATCH', path: `/api/v2/classeur/${args.ref}/update` },
      'reorderClasseurs': { method: 'PUT', path: '/api/v2/classeur/reorder' },
      'listClasseurs': { method: 'GET', path: '/api/v2/classeurs' },
      'getClasseursWithContent': { method: 'GET', path: '/api/v2/classeurs/with-content' },
      'getClasseurTree': { method: 'GET', path: `/api/v2/classeur/${args.ref}/tree` },
      
      // Dossiers
      'createFolder': { method: 'POST', path: '/api/v2/folder/create' },
      'getFolder': { method: 'GET', path: `/api/v2/folder/${args.ref}` },
      'updateFolder': { method: 'PATCH', path: `/api/v2/folder/${args.ref}/update` },
      'moveFolder': { method: 'PUT', path: `/api/v2/folder/${args.ref}/move` },
      'getFolderTree': { method: 'GET', path: `/api/v2/folder/${args.ref}/tree` },
      
      // Recherche
      'searchContent': { method: 'GET', path: '/api/v2/search' },
      'searchFiles': { method: 'GET', path: '/api/v2/files/search' },
      
      // Utilisateur
      'getUserProfile': { method: 'GET', path: '/api/v2/me' },
      'getStats': { method: 'GET', path: '/api/v2/stats' },
      
      // Gestion unifiée
      'getTrash': { method: 'GET', path: '/api/v2/trash' },
      'restoreFromTrash': { method: 'POST', path: '/api/v2/trash/restore' },
      'purgeTrash': { method: 'DELETE', path: '/api/v2/trash/purge' },
      'deleteResource': { method: 'DELETE', path: `/api/v2/delete/${args.resource}/${args.ref}` },
      
      // Agents spécialisés
      'listAgents': { method: 'GET', path: '/api/v2/agents' },
      'createAgent': { method: 'POST', path: '/api/v2/agents' },
      'getAgent': { method: 'GET', path: `/api/v2/agents/${args.agentId}` },
      'executeAgent': { method: 'POST', path: '/api/v2/agents/execute' },
      
      // Outils & Debug
      'listTools': { method: 'GET', path: '/api/v2/tools' },
      'debugInfo': { method: 'GET', path: '/api/v2/debug' }
    };

    const mapping = endpointMapping[toolName];
    if (!mapping) {
      throw new Error(`Tool ${toolName} non supporté`);
    }

    // Construire l'URL complète
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
      || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.scrivia.app');
    const url = `${baseUrl}${mapping.path}`;

    // Préparer les headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'llm',
      'X-Agent-Type': 'specialized', // 🔧 CORRECTION : Marquer comme agent spécialisé
      'Authorization': `Bearer ${userToken}`
    };

    // Préparer le body pour les méthodes POST/PATCH/PUT
    let body: string | undefined;
    if (['POST', 'PATCH', 'PUT'].includes(mapping.method)) {
      body = JSON.stringify(args);
    }

    logger.dev(`[OpenApiToolExecutor] 🚀 Appel ${mapping.method} ${url}`, { args });
    logger.dev(`[OpenApiToolExecutor] 🔧 Headers:`, { 
      'X-Client-Type': headers['X-Client-Type'],
      'X-Agent-Type': headers['X-Agent-Type'],
      'Authorization': 'Bearer [TOKEN]'
    });

    // Faire l'appel API
    const response = await fetch(url, {
      method: mapping.method,
      headers,
      body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    logger.dev(`[OpenApiToolExecutor] ✅ Réponse reçue:`, result);

    return result;
  }

  private parseArguments(argumentsStr: string): any {
    try {
      return JSON.parse(argumentsStr);
    } catch (error) {
      logger.error(`[OpenApiToolExecutor] ❌ Erreur parsing arguments:`, error);
      return {};
    }
  }

  private normalizeResult(rawResult: any, toolName: string, args: any): any {
    // Normaliser le résultat selon le format attendu
    if (rawResult && typeof rawResult === 'object') {
      return {
        ...rawResult,
        tool_name: toolName,
        executed_at: new Date().toISOString()
      };
    }
    
    return {
      success: true,
      data: rawResult,
      tool_name: toolName,
      executed_at: new Date().toISOString()
    };
  }
}
