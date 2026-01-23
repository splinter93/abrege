import type { LLMProvider, AppContext, ChatMessage, LLMResponse } from './types';
import { GroqProvider, GroqResponsesProvider, XAINativeProvider, LiminalityProvider, CerebrasProvider } from './providers';
import { logger, LogCategory } from '@/utils/logger';

interface ProviderMetrics {
  calls: number;
  avgResponseTime: number;
  errors: number;
  lastUsed: Date;
}

export class LLMProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private currentProvider: string = this.getDefaultProvider();
  private rateLimits = new Map<string, { calls: number; resetTime: number }>();
  private metrics = new Map<string, ProviderMetrics>();

  constructor() {
    // Enregistrer les providers par défaut
    this.registerProvider(new GroqProvider());
    this.registerProvider(new GroqResponsesProvider());
    this.registerProvider(new XAINativeProvider()); // ✅ Native API avec support MCP
    this.registerProvider(new LiminalityProvider());
    this.registerProvider(new CerebrasProvider());
    
    // Initialiser les métriques
    this.initializeMetrics();
  }

  private getDefaultProvider(): string {
    switch (process.env.NODE_ENV) {
      case 'production':
        return 'groq'; // Changed from 'synesia' (deprecated)
      case 'development':
        return 'groq';
      default:
        return 'groq';
    }
  }

  private initializeMetrics() {
    this.providers.forEach((provider) => {
      this.metrics.set(provider.id, {
        calls: 0,
        avgResponseTime: 0,
        errors: 0,
        lastUsed: new Date()
      });
    });
  }

  registerProvider(provider: LLMProvider) {
    this.providers.set(provider.id, provider);
    this.metrics.set(provider.id, {
      calls: 0,
      avgResponseTime: 0,
      errors: 0,
      lastUsed: new Date()
    });
    logger.debug(LogCategory.API, `[LLM Manager] ✅ Provider enregistré: ${provider.name} (${provider.id})`);
  }

  setProvider(providerId: string): boolean {
    if (this.validateProvider(providerId)) {
      this.currentProvider = providerId;
      logger.debug(LogCategory.API, `[LLM Manager] 🔄 Provider changé: ${providerId}`);
      return true;
    } else {
      logger.error(LogCategory.API, `[LLM Manager] ❌ Provider non trouvé ou indisponible: ${providerId}`);
      // Fallback vers provider par défaut
      this.currentProvider = this.getDefaultProvider();
      logger.debug(LogCategory.API, `[LLM Manager] 🔄 Fallback vers provider par défaut: ${this.currentProvider}`);
      return false;
    }
  }

  private validateProvider(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    return !!(provider && provider.isAvailable());
  }

  getCurrentProvider(): LLMProvider | null {
    return this.providers.get(this.currentProvider) || null;
  }

  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.isAvailable());
  }

  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<unknown> {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error('Aucun provider LLM disponible');
    }

    if (!provider.isAvailable()) {
      throw new Error(`Provider ${provider.name} non configuré`);
    }

    // ✅ Vérification du rate limiting
    if (!this.checkRateLimit(this.currentProvider)) {
      logger.warn(LogCategory.API, `[LLM Manager] ⚠️ Rate limit atteint pour ${this.currentProvider}`);
      throw new Error(`Rate limit atteint pour ${provider.name}`);
    }

    logger.debug(LogCategory.API, `[LLM Manager] 🚀 Appel via ${provider.name} (${provider.id})`);
    
    try {
      const startTime = Date.now();
      const result = await provider.call(message, context, history);
      const responseTime = Date.now() - startTime;
      
      // ✅ Mettre à jour les métriques
      this.updateMetrics(this.currentProvider, responseTime, false);
      
      return result;
    } catch (error) {
      // ✅ Mettre à jour les métriques d'erreur
      this.updateMetrics(this.currentProvider, 0, true);
      throw error;
    }
  }

  getCurrentProviderId(): string {
    return this.currentProvider;
  }

  getProviderInfo(providerId: string): LLMProvider | null {
    return this.providers.get(providerId) || null;
  }

  // ✅ Méthodes de monitoring et observabilité
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [id, provider] of this.providers) {
      try {
        results[id] = await provider.isAvailable();
      } catch (error) {
        logger.error(LogCategory.API, `[LLM Manager] ❌ Health check failed for ${id}:`, error);
        results[id] = false;
      }
    }
    return results;
  }

  getMetrics(): Record<string, ProviderMetrics> {
    const metrics: Record<string, ProviderMetrics> = {};
    this.metrics.forEach((metric, providerId) => {
      metrics[providerId] = { ...metric };
    });
    return metrics;
  }

  // ✅ Retry logic avec fallback
  async callWithFallback(message: string, context: AppContext, history: ChatMessage[]): Promise<unknown> {
    const providers = this.getAvailableProviders();
    
    for (const provider of providers) {
      try {
        const startTime = Date.now();
        const result = await provider.call(message, context, history);
        const responseTime = Date.now() - startTime;
        
        // Mettre à jour les métriques
        this.updateMetrics(provider.id, responseTime, false);
        
        return result;
      } catch (error) {
        logger.error(LogCategory.API, `[LLM Manager] ❌ Provider ${provider.id} failed:`, error);
        this.updateMetrics(provider.id, 0, true);
        continue;
      }
    }
    
    throw new Error('Aucun provider disponible');
  }

  private updateMetrics(providerId: string, responseTime: number, isError: boolean) {
    const metrics = this.metrics.get(providerId);
    if (metrics) {
      metrics.calls++;
      if (!isError) {
        metrics.avgResponseTime = (metrics.avgResponseTime + responseTime) / 2;
      } else {
        metrics.errors++;
      }
      metrics.lastUsed = new Date();
    }
  }

  // ✅ Rate limiting
  private checkRateLimit(providerId: string): boolean {
    const limit = this.rateLimits.get(providerId);
    if (!limit) return true;
    
    const now = Date.now();
    if (now > limit.resetTime) {
      this.rateLimits.set(providerId, { calls: 1, resetTime: now + 60000 }); // 1 minute
      return true;
    }
    
    if (limit.calls >= 10) { // 10 appels par minute
      return false;
    }
    
    limit.calls++;
    return true;
  }
} 