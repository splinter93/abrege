/**
 * Agent API V2 Tools - Architecture Modulaire
 * Implémentation moderne avec handlers spécialisés
 * TypeScript strict, production-ready
 */

import { simpleLogger as logger } from '@/utils/logger';
import { apiV2Service } from './apiV2/core/ApiV2Service';
import { apiV2Orchestrator } from './apiV2/core/ApiV2Orchestrator';
import type { ToolCall, ApiV2Context } from './apiV2/types/ApiV2Types';

/**
 * Classe principale pour l'exécution des tools API V2
 * Compatible avec l'ancienne interface pour faciliter la migration
 */
export class AgentApiV2Tools {
  private static instance: AgentApiV2Tools;
  private initialized = false;

  private constructor() {}

  /**
   * Instance singleton
   */
  public static getInstance(): AgentApiV2Tools {
    if (!AgentApiV2Tools.instance) {
      AgentApiV2Tools.instance = new AgentApiV2Tools();
    }
    return AgentApiV2Tools.instance;
  }

  /**
   * Initialiser le service (appelé automatiquement au premier usage)
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      console.error(`🚨🚨🚨 [FORCE DEBUG] AgentApiV2Tools.ensureInitialized - Début initialisation 🚨🚨🚨`);
      logger.info('[AgentApiV2Tools] 🚀 Initialisation du service API V2...');
      
      try {
        await apiV2Service.initialize();
        this.initialized = true;
        console.error(`🚨🚨🚨 [FORCE DEBUG] AgentApiV2Tools.ensureInitialized - Initialisation réussie 🚨🚨🚨`);
        logger.info('[AgentApiV2Tools] ✅ Service API V2 initialisé avec succès');
    } catch (error) {
        console.error(`🚨🚨🚨 [FORCE DEBUG] AgentApiV2Tools.ensureInitialized - ERREUR:`, error, `🚨🚨🚨`);
        logger.error('[AgentApiV2Tools] ❌ Erreur lors de l\'initialisation:', error);
        throw error;
      }
      } else {
      console.error(`🚨🚨🚨 [FORCE DEBUG] AgentApiV2Tools.ensureInitialized - Déjà initialisé 🚨🚨🚨`);
    }
  }

  /**
   * Exécuter un tool call (interface compatible avec l'ancien système)
   */
  async executeInternalService(
    toolName: string,
    params: any,
    userId: string,
    authToken: string
  ): Promise<any> {
    try {
      await this.ensureInitialized();

      // Extraire le vrai userId du token si nécessaire
      let realUserId = userId;
      if (userId === 'system-user' && authToken) {
        realUserId = await this.getUserIdFromToken(authToken);
      }

      const toolCall: ToolCall = {
        id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'function',
        function: {
          name: toolName,
          arguments: JSON.stringify(params)
        }
      };

      const context: ApiV2Context = {
        userId: realUserId,
        userToken: authToken,
        sessionId: `session-${Date.now()}`,
        traceId: `trace-${Date.now()}`,
        operation: toolName,
        component: 'AgentApiV2Tools'
      };

      logger.info(`[AgentApiV2Tools] 🚀 Exécution tool: ${toolName}`, {
        userId,
        toolName,
        paramsKeys: Object.keys(params)
      });

      const result = await apiV2Orchestrator.executeToolCall(toolCall, context);

      logger.info(`[AgentApiV2Tools] ✅ Tool exécuté: ${toolName}`, {
          userId,
        toolName,
        success: result.success
      });
      
      return result;
      
    } catch (error) {
      logger.error(`[AgentApiV2Tools] ❌ Erreur tool ${toolName}:`, {
        userId,
          toolName,
        error: error instanceof Error ? error.message : String(error)
    });
      
      return {
        tool_call_id: `error-${Date.now()}`,
        name: toolName,
        content: JSON.stringify({
        success: false, 
          error: error instanceof Error ? error.message : 'Erreur interne du serveur',
          code: 'INTERNAL_ERROR'
        }),
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Attendre l'initialisation (pour la compatibilité)
   */
  async waitForInitialization(): Promise<void> {
    await this.ensureInitialized();
  }

  /**
   * Obtenir les tools pour function calling (interface compatible)
   */
  getToolsForFunctionCalling(capabilities: string[] = []): any[] {
    if (!this.initialized) {
      logger.warn('[AgentApiV2Tools] ⚠️ Service non initialisé, initialisation en cours...');
      this.ensureInitialized().catch(error => {
        logger.error('[AgentApiV2Tools] ❌ Erreur initialisation:', error);
      });
      return [];
    }

    const allTools = apiV2Orchestrator.getAvailableTools();
    
    // Filtrer par capacités si spécifiées
    if (capabilities.length > 0) {
      return allTools.filter(tool => {
        // Logique de filtrage basée sur les capacités
        // Pour l'instant, retourner tous les tools
        return true;
      });
    }

    return allTools;
  }

  /**
   * Méthode de compatibilité avec l'ancien système
   * @deprecated Utiliser executeInternalService à la place
   */
  async executeTool(toolName: string, parameters: any, authToken: string): Promise<any> {
    logger.warn('[AgentApiV2Tools] ⚠️ executeTool est déprécié, utiliser executeInternalService');
    return await this.executeInternalService(toolName, parameters, 'system-user', authToken);
  }

  /**
   * Extraire l'userId du token JWT
   */
  private async getUserIdFromToken(jwtToken: string): Promise<string> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${jwtToken}`
          }
        }
      });
      
        const result = await supabase.auth.getUser();
      
      if (result.error || !result.data.user) {
        throw new Error('Token invalide ou expiré');
      }
      
      return result.data.user.id;
    } catch (error) {
      logger.error(`[AgentApiV2Tools] ❌ Erreur extraction userId:`, error);
      throw new Error('Impossible d\'extraire l\'utilisateur du token');
    }
  }

  /**
   * Obtenir les statistiques du service
   */
  getStats(): any {
    return apiV2Service.getStats();
  }
}

// Instance singleton exportée pour la compatibilité
export const agentApiV2Tools = AgentApiV2Tools.getInstance();
