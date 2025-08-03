import type { LLMProvider, AppContext, ChatMessage } from './types';
import { SynesiaProvider, DeepSeekProvider } from './providers';

export class LLMProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private currentProvider: string = 'synesia'; // default

  constructor() {
    // Enregistrer les providers par défaut
    this.registerProvider(new SynesiaProvider());
    this.registerProvider(new DeepSeekProvider());
  }

  registerProvider(provider: LLMProvider) {
    this.providers.set(provider.id, provider);
    console.log(`[LLM Manager] ✅ Provider enregistré: ${provider.name} (${provider.id})`);
  }

  setProvider(providerId: string) {
    if (this.providers.has(providerId)) {
      this.currentProvider = providerId;
      console.log(`[LLM Manager] 🔄 Provider changé: ${providerId}`);
    } else {
      console.error(`[LLM Manager] ❌ Provider non trouvé: ${providerId}`);
    }
  }

  getCurrentProvider(): LLMProvider | null {
    return this.providers.get(this.currentProvider) || null;
  }

  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.values()).filter(provider => provider.isAvailable());
  }

  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<string> {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error('Aucun provider LLM disponible');
    }

    if (!provider.isAvailable()) {
      throw new Error(`Provider ${provider.name} non configuré`);
    }

    console.log(`[LLM Manager] 🚀 Appel via ${provider.name} (${provider.id})`);
    return provider.call(message, context, history);
  }

  getCurrentProviderId(): string {
    return this.currentProvider;
  }

  getProviderInfo(providerId: string): LLMProvider | null {
    return this.providers.get(providerId) || null;
  }
} 