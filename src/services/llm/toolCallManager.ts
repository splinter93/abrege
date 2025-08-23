import { simpleLogger as logger } from '@/utils/logger';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { ChatMessage } from '@/types/chat';

export interface ToolCallResult {
  tool_call_id: string;
  name: string;
  result: any;
  success: boolean;
  timestamp: string;
}

export class ToolCallManager {
  private static instance: ToolCallManager;
  // Historique d'exécution (clé libre) pour mesurer la pression et nettoyage
  private executionHistory: Set<string> = new Set();
  // 🔧 Anti-boucle 1: IDs de tool_call déjà exécutés (évite exécution du même appel)
  private executedCallIds: Set<string> = new Set();
  // 🔧 Anti-boucle 2: Signatures récentes nom+arguments normalisés → timestamp (TTL court)
  // signature → { ts, batchId }
  private recentSignatureTimestamps: Map<string, { ts: number; batchId?: string }> = new Map();
  
  // 🔧 NOUVEAU: Contexte de session pour permettre l'enchaînement d'actions logiques
  private sessionContexts: Map<string, { 
    startTime: number; 
    toolCount: number; 
    lastToolTime: number;
    contextType: 'creation' | 'modification' | 'mixed';
  }> = new Map();
  
  // Configuration des contextes de session
  private readonly SESSION_CONTEXT_TTL = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_TOOLS_PER_SESSION = 10; // Maximum 10 tools par session
  private readonly SESSION_TOOL_INTERVAL = 10 * 1000; // 10s entre tools dans la même session

  static getInstance(): ToolCallManager {
    if (!ToolCallManager.instance) {
      ToolCallManager.instance = new ToolCallManager();
    }
    return ToolCallManager.instance;
  }

  /**
   * Normalise les arguments (objet, clés triées) et construit la signature logique
   * 🔧 AMÉLIORATION: Logique plus intelligente pour permettre l'enchaînement d'actions
   */
  private buildSignature(funcName: string, argsInput: any): string {
    try {
      const args = this.parseArguments(argsInput);
      
      // 🔧 EXCEPTION: Pour create_folder et create_note, on ignore le nom pour permettre la création avec le même nom
      if ((funcName === 'create_folder' || funcName === 'create_note') && args.name) {
        const argsWithoutName = { ...args };
        delete argsWithoutName.name;
        const sorted = Object.keys(argsWithoutName).sort().reduce((acc: any, k: string) => { acc[k] = argsWithoutName[k]; return acc; }, {});
        return `${funcName}::${JSON.stringify(sorted)}`;
      }
      
      // 🔧 NOUVEAU: Pour les actions de mise à jour, on ignore certains champs pour permettre l'enchaînement
      if (funcName === 'update_note' || funcName === 'update_folder' || funcName === 'update_notebook') {
        // Pour les mises à jour, on ignore les champs qui changent souvent
        const argsWithoutVolatile = { ...args };
        delete argsWithoutVolatile.updated_at;
        delete argsWithoutVolatile.timestamp;
        delete argsWithoutVolatile._optimistic;
        
        if (Object.keys(argsWithoutVolatile).length > 0) {
          const sorted = Object.keys(argsWithoutVolatile).sort().reduce((acc: any, k: string) => { acc[k] = argsWithoutVolatile[k]; return acc; }, {});
          return `${funcName}::${JSON.stringify(sorted)}`;
        }
      }
      
      // 🔧 NOUVEAU: Pour les actions d'ajout de contenu, on ignore le contenu pour permettre l'enchaînement
      if (funcName === 'add_content_to_note' || funcName === 'insert_content_to_note') {
        const argsWithoutContent = { ...args };
        delete argsWithoutContent.content;
        
        if (Object.keys(argsWithoutContent).length > 0) {
          const sorted = Object.keys(argsWithoutContent).sort().reduce((acc: any, k: string) => { acc[k] = argsWithoutContent[k]; return acc; }, {});
          return `${funcName}::${JSON.stringify(sorted)}`;
        }
      }
      
      // Comportement normal pour les autres outils
      const sorted = Object.keys(args).sort().reduce((acc: any, k: string) => { acc[k] = args[k]; return acc; }, {});
      return `${funcName}::${JSON.stringify(sorted)}`;
    } catch {
      return `${funcName}::${typeof argsInput === 'string' ? argsInput : JSON.stringify(argsInput || {})}`;
    }
  }

  /**
   * 🔧 Exécuter un tool call avec gestion des boucles infinies
   */
  async executeToolCall(
    toolCall: any,
    userToken: string,
    maxRetries: number = 3,
    options?: { batchId?: string }
  ): Promise<ToolCallResult> {
    const { id, function: func } = toolCall;
    
    if (!func?.name) {
      throw new Error('Tool call invalide: nom de fonction manquant');
    }

    // 🔐 Sécurité: pression globale → nettoyage soft si trop d'entrées
    if (this.executionHistory.size > 100) { // Réduit de 200 à 100 pour plus de réactivité
      logger.warn(`[ToolCallManager] ⚠️ Trop d'entrées dans l'historique (${this.executionHistory.size}) - nettoyage partiel`);
      this.clearExecutionHistory();
    }

    // 🔧 ANTI-BOUCLE: Empêcher la ré-exécution du même tool_call_id
    if (this.executedCallIds.has(id)) {
      logger.warn(`[ToolCallManager] ⚠️ tool_call_id ${id} déjà exécuté - anti-boucle`);
      return {
        tool_call_id: id,
        name: func.name,
        result: { success: false, error: 'Tool call déjà exécuté', code: 'ANTI_LOOP_ID' },
        success: false,
        timestamp: new Date().toISOString()
      };
    }

    // 🔧 ANTI-BOUCLE (TTL 30s): Empêcher la ré-exécution immédiate du même tool (même nom+args)
    const signature = this.buildSignature(func.name, func.arguments);
    const now = Date.now();
    const lastSig = this.recentSignatureTimestamps.get(signature);
    const TTL_MS = 30_000; // 🔧 CORRECTION: 30s TTL au lieu de 5s pour permettre l'enchaînement d'actions
    
    // 🔧 NOUVEAU: Vérifier le contexte de session pour permettre l'enchaînement d'actions
    const sessionId = this.getSessionId(func.name, func.arguments);
    const sessionContext = this.sessionContexts.get(sessionId);
    
    if (lastSig && (now - lastSig.ts < TTL_MS)) {
      // Si même batch, autoriser. Sinon anti-loop.
      if (!options?.batchId || lastSig.batchId !== options.batchId) {
        // 🔧 NOUVEAU: Vérifier si c'est dans le contexte d'une session active
        if (sessionContext && this.isSessionActive(sessionContext, now)) {
          logger.info(`[ToolCallManager] ✅ Tool ${func.name} autorisé dans le contexte de session active`);
          // Continuer l'exécution
        } else {
          logger.warn(`[ToolCallManager] ⚠️ Tool ${func.name} ignoré (signature récente <${TTL_MS}ms) - anti-boucle`);
          return {
            tool_call_id: id,
            name: func.name,
            result: { success: false, error: `Signature exécutée récemment (<${TTL_MS}ms)`, code: 'ANTI_LOOP_SIGNATURE' },
            success: false,
            timestamp: new Date().toISOString()
          };
        }
      }
    }
    
    // 🔧 NOUVEAU: Mettre à jour le contexte de session
    this.updateSessionContext(sessionId, func.name, now);

    // Marquer ID et signature comme utilisés (avec batchId)
    this.executedCallIds.add(id);
    this.recentSignatureTimestamps.set(signature, { ts: now, batchId: options?.batchId });

    // Traces dans l'historique pour supervision
    const histKey = `${func.name}-${id}-${now}`;
    this.executionHistory.add(histKey);
    setTimeout(() => {
      this.executionHistory.delete(histKey);
      // Expiration de l'ID exécuté (5 min)
      this.executedCallIds.delete(id);
    }, 5 * 60 * 1000);
    // Expiration de la signature plus courte (30s)
    setTimeout(() => {
      // Ne pas supprimer si ré-écrite plus récemment
      const rec = this.recentSignatureTimestamps.get(signature);
      if (rec && rec.ts <= now) this.recentSignatureTimestamps.delete(signature);
    }, 30_000); // 30 secondes au lieu de TTL_MS + 500

    try {
      const args = this.parseArguments(func.arguments);
      logger.info(`[ToolCallManager] 🔧 Exécution de ${func.name}...`);

      // Exécuter le tool avec timeout optimisé (3s au lieu de 15s)
      const toolCallPromise = agentApiV2Tools.executeTool(func.name, args, userToken);
      const timeoutPromise = new Promise((resolve) => { 
        setTimeout(() => resolve({ success: false, error: 'Timeout tool call (3s)' }), 3000); 
      });
      const rawResult = await Promise.race([toolCallPromise, timeoutPromise]);

      // Normaliser le résultat
      const normalized = this.normalizeResult(rawResult, func.name, args);
      logger.info(`[ToolCallManager] ✅ Tool ${func.name} exécuté avec succès`);

      return {
        tool_call_id: id,
        name: func.name,
        result: normalized,
        success: normalized.success !== false && !normalized.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`[ToolCallManager] ❌ Échec de l'exécution du tool ${func.name}:`, error);
      const normalized = { 
        success: false, 
        code: this.detectErrorCode(error),
        message: `❌ ÉCHEC : ${error instanceof Error ? error.message : String(error)}`, 
        details: { raw: error instanceof Error ? error.stack || error.message : String(error) }, 
        tool_name: func.name, 
        tool_args: func.arguments, 
        timestamp: new Date().toISOString() 
      };

      return {
        tool_call_id: id,
        name: func.name,
        result: normalized,
        success: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  private parseArguments(argumentsStr: string): any {
    try { return typeof argumentsStr === 'string' ? JSON.parse(argumentsStr || '{}') : (argumentsStr || {}); }
    catch { return { _raw: argumentsStr }; }
  }

  private normalizeResult(rawResult: any, toolName: string, args: any): any {
    if (rawResult && typeof rawResult === 'object' && 'success' in rawResult) return rawResult;
    return { success: true, data: rawResult, tool: toolName, args };
  }

  private detectErrorCode(error: any): string {
    const t = String(error?.message || error || '').toLowerCase();
    if (t.includes('timeout')) return 'TIMEOUT';
    if (t.includes('forbidden') || t.includes('permission')) return 'FORBIDDEN';
    if (t.includes('rls')) return 'RLS_DENIED';
    if (t.includes('not found')) return 'NOT_FOUND';
    if (t.includes('zod') || t.includes('validation')) return 'VALIDATION_ERROR';
    return 'UNKNOWN';
  }

  clearExecutionHistory(): void {
    this.executionHistory.clear();
    this.executedCallIds.clear();
    this.recentSignatureTimestamps.clear();
  }

  /**
   * Obtenir la taille de l'historique d'exécution
   */
  getExecutionHistorySize(): number {
    return this.executionHistory.size;
  }
  
  /**
   * 🔧 NOUVEAU: Générer un ID de session basé sur le type d'action et les arguments
   */
  private getSessionId(funcName: string, argsInput: any): string {
    try {
      const args = this.parseArguments(argsInput);
      
      // Pour les actions de création, utiliser le notebook_id comme contexte
      if (funcName.startsWith('create_') && args.notebook_id) {
        return `session_${funcName}_${args.notebook_id}`;
      }
      
      // Pour les actions de modification, utiliser l'ID de l'entité
      if (funcName.startsWith('update_') && args.ref) {
        return `session_${funcName}_${args.ref}`;
      }
      
      // Pour les actions d'ajout de contenu, utiliser l'ID de la note
      if ((funcName === 'add_content_to_note' || funcName === 'insert_content_to_note') && args.ref) {
        return `session_content_${args.ref}`;
      }
      
      // Par défaut, utiliser le nom de la fonction
      return `session_${funcName}_default`;
    } catch {
      return `session_${funcName}_unknown`;
    }
  }
  
  /**
   * 🔧 NOUVEAU: Vérifier si une session est active
   */
  private isSessionActive(context: any, now: number): boolean {
    // Vérifier si la session n'a pas expiré
    if (now - context.startTime > this.SESSION_CONTEXT_TTL) {
      return false;
    }
    
    // Vérifier si on n'a pas dépassé le nombre maximum de tools
    if (context.toolCount >= this.MAX_TOOLS_PER_SESSION) {
      return false;
    }
    
    // Vérifier si le dernier tool n'est pas trop récent
    if (now - context.lastToolTime < this.SESSION_TOOL_INTERVAL) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 🔧 NOUVEAU: Mettre à jour le contexte de session
   */
  private updateSessionContext(sessionId: string, funcName: string, now: number): void {
    const existing = this.sessionContexts.get(sessionId);
    
    if (existing) {
      // Mettre à jour la session existante
      existing.toolCount++;
      existing.lastToolTime = now;
    } else {
      // Créer une nouvelle session
      this.sessionContexts.set(sessionId, {
        startTime: now,
        toolCount: 1,
        lastToolTime: now,
        contextType: this.getContextType(funcName)
      });
    }
    
    // Nettoyer les sessions expirées
    this.cleanupExpiredSessions(now);
  }
  
  /**
   * 🔧 NOUVEAU: Déterminer le type de contexte
   */
  private getContextType(funcName: string): 'creation' | 'modification' | 'mixed' {
    if (funcName.startsWith('create_')) return 'creation';
    if (funcName.startsWith('update_')) return 'modification';
    if (funcName.startsWith('add_') || funcName.startsWith('insert_')) return 'modification';
    return 'mixed';
  }
  
  /**
   * 🔧 NOUVEAU: Nettoyer les sessions expirées
   */
  private cleanupExpiredSessions(now: number): void {
    for (const [sessionId, context] of this.sessionContexts.entries()) {
      if (now - context.startTime > this.SESSION_CONTEXT_TTL) {
        this.sessionContexts.delete(sessionId);
      }
    }
  }
} 