import type { LLMProvider, AppContext, ChatMessage } from '../types';
import { Agent } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

export class TogetherProvider implements LLMProvider {
  name = 'Together AI';
  id = 'together';
  
  private apiKey: string;
  private baseUrl = 'https://api.together.xyz/v1';

  constructor() {
    this.apiKey = process.env.TOGETHER_API_KEY || '';
  }

  async call(message: string, context: AppContext, history: ChatMessage[], agentConfig?: Agent): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Together AI API key not configured');
    }

    try {
      // Utiliser la configuration de l'agent ou les valeurs par défaut
      const config = this.mergeConfigWithAgent(agentConfig);
      
      // Préparer les messages
      const messages = this.prepareMessages(message, context, history, config);
      
      // Préparer le payload
      const payload = this.preparePayload(messages, config);
      
      logger.dev(`[${this.name} Provider] 📤 Payload:`, payload);

      // Faire l'appel API
      const response = await this.makeApiCall(payload, config);
      
      logger.dev(`[${this.name} Provider] ✅ Réponse reçue:`, response);

      return this.extractResponse(response);

    } catch (error) {
      logger.error(`[${this.name} Provider] ❌ Erreur:`, error);
      throw error;
    }
  }

  /**
   * Fusionne la configuration par défaut avec celle de l'agent
   */
  private mergeConfigWithAgent(agentConfig?: Agent) {
    const defaultConfig = {
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.9,
      system_instructions: 'Tu es un assistant IA utile et bienveillant.',
      context_template: '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
      api_config: {}
    };

    if (!agentConfig) {
      return defaultConfig;
    }

    const mergedConfig = {
      model: agentConfig.model || defaultConfig.model,
      temperature: agentConfig.temperature || defaultConfig.temperature,
      max_tokens: agentConfig.max_tokens || defaultConfig.max_tokens,
      top_p: agentConfig.top_p || defaultConfig.top_p,
      system_instructions: agentConfig.system_instructions || defaultConfig.system_instructions,
      context_template: agentConfig.context_template || defaultConfig.context_template,
      api_config: { ...defaultConfig.api_config, ...agentConfig.api_config }
    };

    return mergedConfig;
  }

  /**
   * Prépare les messages pour l'API
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[], config: Record<string, unknown>) {
    const systemContent = this.formatContext(context, config);
    
    return [
      {
        role: 'system' as const,
        content: systemContent
      },
      ...history.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ];
  }

  /**
   * Prépare le payload pour l'API Together
   */
  private preparePayload(messages: unknown[], config: Record<string, unknown>) {
    const isQwen = (config.model as string)?.includes('Qwen');
    
    const basePayload = {
      model: config.model,
      messages,
      stream: false, // Sera override par l'API route
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p
    };

    // ✅ NOUVEAU: Configuration spéciale pour Qwen 3 selon la documentation Alibaba Cloud
    if (isQwen) {
      return {
        ...basePayload,
        enable_thinking: false, // ❌ DÉSACTIVÉ: Le thinking/reasoning pour Qwen
        result_format: 'message' // ✅ Format de réponse avec reasoning
      };
    }

    return basePayload;
  }

  /**
   * Fait l'appel API vers Together
   */
  private async makeApiCall(payload: unknown, config: Record<string, unknown>) {
    const apiConfig = config.api_config as Record<string, unknown> || {};
    const endpoint = (apiConfig.endpoint as string) || '/chat/completions';
    const url = `${(apiConfig.baseUrl as string) || this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...(apiConfig.headers as Record<string, string> || {})
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${this.name} API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Extrait la réponse de l'API Together
   */
  private extractResponse(data: unknown): string {
    const response = data as Record<string, unknown>;
    const choices = response.choices as unknown[];
    const firstChoice = choices?.[0] as Record<string, unknown>;
    const message = firstChoice?.message as Record<string, unknown>;
    return (message?.content as string) || 'Désolé, je n\'ai pas pu traiter votre demande.';
  }

  /**
   * Formate le contexte avec le template
   */
  private formatContext(context: AppContext, config: Record<string, unknown>): string {
    const template = config.context_template as string;
    if (!template) {
      return config.system_instructions as string;
    }

    // Remplacement simple des variables du template
    let formatted = template
      .replace(/\{\{type\}\}/g, context.type || '')
      .replace(/\{\{name\}\}/g, context.name || '')
      .replace(/\{\{id\}\}/g, context.id || '')
      .replace(/\{\{content\}\}/g, context.content || '');

    // Gestion conditionnelle simple
    if (!context.content) {
      formatted = formatted.replace(/\{\{#if content\}\}(.*?)\{\{\/if\}\}/g, '');
    } else {
      formatted = formatted.replace(/\{\{#if content\}\}(.*?)\{\{\/if\}\}/g, '$1');
    }

    return `${config.system_instructions}\n\n${formatted}`;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Configuration par défaut pour Together AI
   */
  getDefaultConfig() {
    return {
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.9,
      system_instructions: 'Tu es un assistant IA utile et bienveillant.',
      context_template: '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
      api_config: {
        baseUrl: 'https://api.together.xyz/v1',
        endpoint: '/chat/completions'
      }
    };
  }
} 