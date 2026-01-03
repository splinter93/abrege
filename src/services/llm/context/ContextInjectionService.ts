/**
 * ContextInjectionService - Orchestrateur pour l'injection de contexte modulaire
 * Pattern Strategy similaire à ModelOverrideService
 * 
 * Responsabilités:
 * - Enregistrement des ContextProviders
 * - Résolution de l'ordre d'injection
 * - Séparation system message vs messages séparés
 * - Logging structuré
 * 
 * Conformité: < 200 lignes, ZERO any, logging structuré
 */

import { simpleLogger as logger } from '@/utils/logger';
import type {
  ContextProvider,
  SystemContextProvider,
  MessageContextProvider,
  ContextInjectionResult,
  ExtendedLLMContext,
  ContextInjectionOptions
} from './types';
import type { AgentSystemConfig } from '@/services/llm/SystemMessageBuilder';

export class ContextInjectionService {
  private static instance: ContextInjectionService;
  private systemProviders: SystemContextProvider[] = [];
  private messageProviders: MessageContextProvider[] = [];

  private constructor() {
    // Private constructor pour singleton
  }

  /**
   * Récupère l'instance singleton
   */
  static getInstance(): ContextInjectionService {
    if (!ContextInjectionService.instance) {
      ContextInjectionService.instance = new ContextInjectionService();
      logger.dev('[ContextInjectionService] ✅ Instance singleton créée');
    }
    return ContextInjectionService.instance;
  }

  /**
   * Enregistre un SystemContextProvider
   * @param provider - Provider à enregistrer
   */
  registerSystemProvider(provider: SystemContextProvider): void {
    this.systemProviders.push(provider);
    logger.dev(`[ContextInjectionService] ✅ SystemContextProvider enregistré: ${provider.name}`);
  }

  /**
   * Enregistre un MessageContextProvider
   * @param provider - Provider à enregistrer
   */
  registerMessageProvider(provider: MessageContextProvider): void {
    this.messageProviders.push(provider);
    logger.dev(`[ContextInjectionService] ✅ MessageContextProvider enregistré: ${provider.name}`);
  }

  /**
   * Injecte le contexte complet en utilisant tous les providers enregistrés
   * @param agentConfig - Configuration de l'agent
   * @param context - Contexte LLM étendu
   * @param options - Options d'injection
   * @returns Résultat de l'injection (system message + context messages)
   */
  injectContext(
    agentConfig: AgentSystemConfig,
    context: ExtendedLLMContext,
    options?: ContextInjectionOptions
  ): ContextInjectionResult {
    const providersApplied: string[] = [];

    // 1. Construire le system message avec les SystemContextProviders
    const systemParts: string[] = [];
    
    // Trier par priorité (plus bas = injecté en premier)
    const sortedSystemProviders = [...this.systemProviders].sort((a, b) => 
      (a.priority || 0) - (b.priority || 0)
    );

    for (const provider of sortedSystemProviders) {
      if (provider.shouldInject(context, options)) {
        try {
          const injected = provider.inject(agentConfig, context, options);
          if (injected && injected.trim()) {
            systemParts.push(injected);
            providersApplied.push(provider.name);
            logger.dev(`[ContextInjectionService] ✅ ${provider.name} injecté dans system message`);
          }
        } catch (error) {
          logger.error(`[ContextInjectionService] ❌ Erreur injection ${provider.name}:`, error);
        }
      }
    }

    const systemMessage = systemParts.join('\n\n');

    // 2. Construire les context messages avec les MessageContextProviders
    const contextMessages: import('@/types/chat').ChatMessage[] = [];

    for (const provider of this.messageProviders) {
      if (provider.shouldInject(context, options)) {
        try {
          const message = provider.inject(context, options);
          if (message) {
            contextMessages.push(message);
            providersApplied.push(provider.name);
            logger.dev(`[ContextInjectionService] ✅ ${provider.name} injecté comme message séparé`);
          }
        } catch (error) {
          logger.error(`[ContextInjectionService] ❌ Erreur injection ${provider.name}:`, error);
        }
      }
    }

    logger.info('[ContextInjectionService] ✅ Contexte injecté:', {
      providersApplied,
      systemMessageLength: systemMessage.length,
      contextMessagesCount: contextMessages.length,
      totalTokensEstimate: Math.ceil((systemMessage.length + contextMessages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0), 0)) / 4)
    });

    return {
      systemMessage: systemMessage.trim(),
      contextMessages,
      metadata: {
        providersApplied,
        systemMessageLength: systemMessage.length,
        contextMessagesCount: contextMessages.length,
        totalTokensEstimate: Math.ceil((systemMessage.length + contextMessages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0), 0)) / 4)
      }
    };
  }

  /**
   * Réinitialise tous les providers (utile pour tests)
   */
  reset(): void {
    this.systemProviders = [];
    this.messageProviders = [];
    logger.dev('[ContextInjectionService] 🔄 Providers réinitialisés');
  }
}

/**
 * Instance singleton exportée
 */
export const contextInjectionService = ContextInjectionService.getInstance();

