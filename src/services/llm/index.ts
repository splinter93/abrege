export { LLMProviderManager } from './providerManager';
export type { LLMProvider, AppContext, ChatMessage, LLMResponse } from './types';
export { GroqProvider, LiminalityProvider } from './providers';

// Instance singleton du manager
import { LLMProviderManager } from './providerManager';
export const llmManager = new LLMProviderManager(); 