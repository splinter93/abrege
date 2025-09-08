/**
 * Registry centralisé pour la gestion des tools et handlers
 * Architecture modulaire et extensible
 */

import { simpleLogger as logger } from '@/utils/logger';
import type {
  ToolRegistry,
  BaseHandler,
  ToolDefinition,
  ToolCall,
  ApiV2Context,
  ValidationResult
} from '../types/ApiV2Types';

export class ToolRegistryImpl implements ToolRegistry {
  private handlers: Map<string, BaseHandler> = new Map();
  private operationToHandler: Map<string, string> = new Map();

  /**
   * Enregistrer un nouveau handler
   */
  registerHandler(handler: BaseHandler): void {
    logger.info(`[ToolRegistry] 📝 Enregistrement handler: ${handler.name}`, {
      supportedOperations: handler.supportedOperations
    });

    this.handlers.set(handler.name, handler);

    // Mapper chaque opération vers le handler
    for (const operation of handler.supportedOperations) {
      if (this.operationToHandler.has(operation)) {
        logger.warn(`[ToolRegistry] ⚠️ Opération ${operation} déjà enregistrée par ${this.operationToHandler.get(operation)}`);
      }
      this.operationToHandler.set(operation, handler.name);
    }

    logger.info(`[ToolRegistry] ✅ Handler ${handler.name} enregistré avec ${handler.supportedOperations.length} opérations`);
  }

  /**
   * Récupérer un handler par nom d'opération
   */
  getHandler(operation: string): BaseHandler | null {
    const handlerName = this.operationToHandler.get(operation);
    if (!handlerName) {
      logger.warn(`[ToolRegistry] ❌ Aucun handler trouvé pour l'opération: ${operation}`);
      return null;
    }

    const handler = this.handlers.get(handlerName);
    if (!handler) {
      logger.error(`[ToolRegistry] ❌ Handler ${handlerName} non trouvé dans le registry`);
      return null;
    }

    return handler;
  }

  /**
   * Récupérer toutes les définitions de tools
   */
  getAllToolDefinitions(): ToolDefinition[] {
    const allTools: ToolDefinition[] = [];

    for (const handler of this.handlers.values()) {
      const handlerTools = handler.getToolDefinitions();
      allTools.push(...handlerTools);
    }

    logger.dev(`[ToolRegistry] 📋 ${allTools.length} tools récupérés de ${this.handlers.size} handlers`);
    return allTools;
  }

  /**
   * Récupérer toutes les opérations supportées
   */
  getSupportedOperations(): string[] {
    return Array.from(this.operationToHandler.keys()).sort();
  }

  /**
   * Vérifier si une opération est supportée
   */
  isOperationSupported(operation: string): boolean {
    return this.operationToHandler.has(operation);
  }

  /**
   * Récupérer les statistiques du registry
   */
  getStats(): {
    totalHandlers: number;
    totalOperations: number;
    handlers: Array<{ name: string; operations: number }>;
  } {
    const handlers = Array.from(this.handlers.values()).map(handler => ({
      name: handler.name,
      operations: handler.supportedOperations.length
    }));

    return {
      totalHandlers: this.handlers.size,
      totalOperations: this.operationToHandler.size,
      handlers
    };
  }

  /**
   * Vider le registry (utile pour les tests)
   */
  clear(): void {
    logger.info(`[ToolRegistry] 🗑️ Nettoyage du registry`);
    this.handlers.clear();
    this.operationToHandler.clear();
  }
}

// Instance singleton du registry
export const toolRegistry = new ToolRegistryImpl();
