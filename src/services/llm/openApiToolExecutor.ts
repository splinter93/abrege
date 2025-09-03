import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

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
  private supabase: any;
  
  // Historique des IDs déjà exécutés (évite la double exécution)
  private executedCallIds: Set<string> = new Set();

  private constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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
    // Mapper le nom du tool vers l'endpoint API v2
    const endpointMapping: Record<string, { method: string; path: string }> = {
      'create_note': { method: 'POST', path: '/api/v2/note/create' },
      'get_note': { method: 'GET', path: `/api/v2/note/${args.ref}` },
      'update_note': { method: 'PATCH', path: `/api/v2/note/${args.ref}/update` },
      'insert_content_to_note': { method: 'PATCH', path: `/api/v2/note/${args.ref}/insert-content` },
      'move_note': { method: 'PUT', path: `/api/v2/note/${args.ref}/move` },
      'get_note_toc': { method: 'GET', path: `/api/v2/note/${args.ref}/table-of-contents` },
      'get_recent_notes': { method: 'GET', path: '/api/v2/note/recent' },
      'create_classeur': { method: 'POST', path: '/api/v2/classeur/create' },
      'get_classeur': { method: 'GET', path: `/api/v2/classeur/${args.ref}` },
      'list_classeurs': { method: 'GET', path: '/api/v2/classeurs' },
      'get_classeur_tree': { method: 'GET', path: `/api/v2/classeur/${args.ref}/tree` },
      'create_folder': { method: 'POST', path: '/api/v2/folder/create' },
      'get_folder': { method: 'GET', path: `/api/v2/folder/${args.ref}` },
      'get_folder_tree': { method: 'GET', path: `/api/v2/folder/${args.ref}/tree` },
      'search_notes': { method: 'GET', path: '/api/v2/search' },
      'search_files': { method: 'GET', path: '/api/v2/files/search' },
      'get_user_info': { method: 'GET', path: '/api/v2/me' },
      'get_platform_stats': { method: 'GET', path: '/api/v2/stats' },
      'delete_resource': { method: 'DELETE', path: `/api/v2/delete/${args.resource}/${args.ref}` }
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
      'Authorization': `Bearer ${userToken}`
    };

    // Préparer le body pour les méthodes POST/PATCH/PUT
    let body: string | undefined;
    if (['POST', 'PATCH', 'PUT'].includes(mapping.method)) {
      body = JSON.stringify(args);
    }

    logger.dev(`[OpenApiToolExecutor] 🚀 Appel ${mapping.method} ${url}`, { args });

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
