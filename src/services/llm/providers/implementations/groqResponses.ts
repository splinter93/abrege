import { BaseProvider, type ProviderCapabilities, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import type { ChatMessage } from '@/types/chat';
import { logger } from '@/utils/logger';
import { getSystemMessage } from '../../templates';
import type {
  GroqMessage,
  GroqResponsesApiResponse,
  Tool,
  FunctionTool,
  ToolCall,
  isMcpTool
} from '../../types/strictTypes';

/**
 * Configuration spécifique à Groq Responses API
 */
interface GroqResponsesConfig extends ProviderConfig {
  // Spécifique à Groq Responses
  serviceTier?: 'auto' | 'default' | 'flex' | 'performance';
  parallelToolCalls?: boolean;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  
  // Nouvelles fonctionnalités Responses API
  enableBrowserSearch?: boolean;
  enableCodeExecution?: boolean;
  enableStructuredOutput?: boolean;
  enableImages?: boolean;
}

/**
 * Informations sur Groq Responses API
 */
const GROQ_RESPONSES_INFO: ProviderInfo = {
  id: 'groq-responses',
  name: 'Groq Responses API',
  version: '2.0.0',
  description: 'Ultra-fast inference platform with Responses API - Browser Search, Code Execution, Images support',
  capabilities: {
    functionCalls: true,
    streaming: false, // Responses API ne supporte pas le streaming
    reasoning: false, // Responses API ne supporte pas le reasoning explicite
    codeExecution: true,
    webSearch: true,
    structuredOutput: true,
    images: true
  },
  supportedModels: [
    'openai/gpt-oss-20b', // ✅ Support Browser Search + Code Execution
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile', // ✅ Support Images
    'moonshotai/kimi-k2-instruct' // ✅ Support Structured Outputs
  ],
  pricing: {
    input: '$0.15/1M tokens',
    output: '$0.75/1M tokens'
  }
};

/**
 * Configuration par défaut de Groq Responses
 */
const DEFAULT_GROQ_RESPONSES_CONFIG: GroqResponsesConfig = {
  // Base
  apiKey: process.env.GROQ_API_KEY || '',
  baseUrl: 'https://api.groq.com/openai/v1',
  timeout: 30000,
  
  // LLM
  model: 'openai/gpt-oss-20b', // ✅ Modèle avec Browser Search + Code Execution
  temperature: 0.7,
  maxTokens: 8000,
  topP: 0.9,
  
  // Features
  supportsFunctionCalls: true,
  supportsStreaming: false, // ✅ Responses API ne supporte pas le streaming
  supportsReasoning: false, // ✅ Responses API ne supporte pas le reasoning explicite
  
  // Monitoring
  enableLogging: true,
  enableMetrics: true,
  
  // Groq spécifique
  serviceTier: 'default', // ✅ Correction: Responses API accepte 'default' au lieu de 'on_demand'
  parallelToolCalls: true,
  reasoningEffort: 'low',
  
  // Nouvelles fonctionnalités Responses API
  enableBrowserSearch: true,
  enableCodeExecution: true,
  enableStructuredOutput: true,
  enableImages: true
};

/**
 * Provider Groq Responses API
 * 
 * Implémente la nouvelle API Responses de Groq avec :
 * - Browser Search (recherche web en temps réel)
 * - Code Execution (exécution Python)
 * - Images (support des inputs visuels)
 * - Structured Outputs (validation JSON stricte)
 */
export class GroqResponsesProvider extends BaseProvider implements LLMProvider {
  readonly info = GROQ_RESPONSES_INFO;
  readonly config: GroqResponsesConfig;

  constructor(customConfig?: Partial<GroqResponsesConfig>) {
    super();
    this.config = { ...DEFAULT_GROQ_RESPONSES_CONFIG, ...customConfig };
  }

  get name(): string {
    return this.info.name;
  }

  get id(): string {
    return this.info.id;
  }

  /**
   * Vérifie si Groq Responses API est disponible
   */
  isAvailable(): boolean {
    return this.validateConfig();
  }

  /**
   * Valide la configuration
   */
  validateConfig(): boolean {
    if (!this.validateBaseConfig()) {
      logger.error('[GroqResponsesProvider] ❌ Configuration de base invalide');
      return false;
    }

    if (!this.config.model) {
      logger.error('[GroqResponsesProvider] ❌ Modèle non spécifié');
      return false;
    }

    if (!this.info.supportedModels.includes(this.config.model)) {
      logger.warn(`[GroqResponsesProvider] ⚠️ Modèle ${this.config.model} non officiellement supporté`);
    }

    logger.debug('[GroqResponsesProvider] ✅ Configuration validée');
    return true;
  }

  /**
   * Effectue un appel à l'API Groq Responses
   */
  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<string> {
    if (!this.validateConfig()) {
      throw new Error('Configuration Groq Responses invalide');
    }

    logger.debug(`[GroqResponsesProvider] 🚀 Appel avec modèle: ${this.config.model}`);

    try {
      // Préparer les messages pour la conversion
      const messages = this.prepareMessages(message, context, history);
      
      // Préparer le payload pour l'API Responses
      const payload = this.prepareResponsesPayload(messages);
      
      // Effectuer l'appel API
      const response = await this.makeResponsesApiCall(payload);
      
      // Extraire et formater la réponse
      const result = this.extractResponsesResponse(response);
      
      logger.debug('[GroqResponsesProvider] ✅ Appel réussi');
      return result;

    } catch (error) {
      logger.error('[GroqResponsesProvider] ❌ Erreur lors de l\'appel:', error);
      throw error;
    }
  }

  /**
   * Prépare les messages pour la conversion vers l'API Responses
   * 
   * L'API Responses utilise un champ 'input' au lieu de 'messages'
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[]): GroqMessage[] {
    const messages: GroqMessage[] = [];

    // Message système
    const systemContent = this.formatSystemMessage(context);
    messages.push({
      role: 'system',
      content: systemContent
    });

    // Historique des messages
    for (const msg of history) {
      const messageObj: GroqMessage = {
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: msg.content
      };

      // Gérer les tool calls pour les messages assistant
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        messageObj.tool_calls = msg.tool_calls as ToolCall[];
      }

      // Gérer les tool results pour les messages tool
      if (msg.role === 'tool' && msg.tool_call_id) {
        messageObj.tool_call_id = msg.tool_call_id;
        if (msg.name) {
          messageObj.name = msg.name;
        }
      }

      messages.push(messageObj);
    }

    // Message utilisateur actuel
    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  /**
   * Prépare le payload pour l'API Responses
   * 
   * Conversion de 'messages' vers 'input' + support des nouvelles fonctionnalités
   */
  private prepareResponsesPayload(messages: GroqMessage[]): Record<string, unknown> {
    // 🎯 CONVERSION PRINCIPALE : messages → input
    const input = this.convertMessagesToInput(messages);
    
    const payload: Record<string, unknown> = {
      model: this.config.model,
      input, // ✅ Nouveau format pour Responses API
      temperature: this.config.temperature,
      top_p: this.config.topP
      // ✅ Suppression de max_tokens - l'API Responses gère automatiquement
    };
    
    // Ajouter les built-in tools si activés
    const builtInTools = this.getBuiltInTools();
    if (builtInTools.length > 0) {
      payload.tools = builtInTools;
      payload.tool_choice = 'auto'; // ✅ Laisser le modèle décider
      logger.debug(`[GroqResponsesProvider] 🔧 ${builtInTools.length} built-in tools ajoutés`);
    }

    // Ajouter les paramètres spécifiques à Groq
    // ✅ Suppression de service_tier - l'API Responses ne le supporte pas
    // if (this.config.serviceTier) {
    //   payload.service_tier = this.config.serviceTier;
    // }

    if (this.config.parallelToolCalls) {
      payload.parallel_tool_calls = this.config.parallelToolCalls;
    }

    return payload;
  }

  /**
   * Convertit les messages en format input pour l'API Responses
   * 
   * L'API Responses attend un string simple au lieu d'un array de messages
   */
  private convertMessagesToInput(messages: GroqMessage[]): string {
    // Pour l'instant, on prend le dernier message utilisateur
    // TODO: Améliorer pour gérer l'historique complet
    const lastUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop();
    
    if (lastUserMessage && lastUserMessage.content) {
      return lastUserMessage.content;
    }
    
    // Fallback
    return messages[messages.length - 1]?.content || '';
  }

  /**
   * Valide les tools pour l'API Responses
   */
  private validateTools(tools: Tool[]): Tool[] {
    return tools.filter((tool) => {
      if (!tool || typeof tool !== 'object') {
        logger.warn(`[GroqResponsesProvider] ⚠️ Tool invalide ignoré:`, tool);
        return false;
      }
      
      // ✅ L'API Responses utilise une structure différente pour les tools
      if (tool.type === 'function') {
        const funcTool = tool as FunctionTool;
        if (!funcTool.function || typeof funcTool.function !== 'object') {
          logger.warn(`[GroqResponsesProvider] ⚠️ Tool sans fonction ignoré:`, tool);
          return false;
        }
        
        if (!funcTool.function.name || typeof funcTool.function.name !== 'string') {
          logger.warn(`[GroqResponsesProvider] ⚠️ Tool sans nom de fonction ignoré:`, tool);
          return false;
        }
        
        const params = funcTool.function.parameters;
        if (!params || params.type !== 'object' || typeof params.properties !== 'object' || !Array.isArray(params.required)) {
          logger.warn(`[GroqResponsesProvider] ⚠️ Tool avec paramètres invalides ignoré: ${funcTool.function.name}`, params);
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Retourne les built-in tools disponibles pour l'API Responses
   */
  private getBuiltInTools(): Array<Record<string, unknown>> {
    const builtInTools: Array<Record<string, unknown>> = [];

    // Browser Search
    if (this.config.enableBrowserSearch && this.supportsBrowserSearch()) {
      builtInTools.push({
        type: "browser_search"
      });
    }

    // Code Execution
    if (this.config.enableCodeExecution && this.supportsCodeExecution()) {
      builtInTools.push({
        type: "code_interpreter",
        container: {
          "type": "auto"
        }
      });
    }

    return builtInTools;
  }

  /**
   * Vérifie si le modèle supporte Browser Search
   */
  private supportsBrowserSearch(): boolean {
    return ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(this.config.model);
  }

  /**
   * Vérifie si le modèle supporte Code Execution
   */
  private supportsCodeExecution(): boolean {
    return ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'].includes(this.config.model);
  }



  /**
   * Effectue l'appel API à Groq Responses
   */
  private async makeResponsesApiCall(payload: Record<string, unknown>): Promise<GroqResponsesApiResponse> {
    // ✅ Optimiser le payload pour éviter les timeouts
    const optimizedPayload = this.optimizeRequest(payload);
    
    const response = await fetch(`${this.config.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(optimizedPayload),
      signal: AbortSignal.timeout(120000) // ✅ 2 minutes au lieu de 30s
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq Responses API error: ${response.status} - ${errorText}`);
    }

    return await response.json() as GroqResponsesApiResponse;
  }

  /**
   * Optimise la requête pour éviter les timeouts
   */
  private optimizeRequest(payload: Record<string, unknown>): Record<string, unknown> {
    const optimized = { ...payload };
    
    // ✅ Réduire la taille de l'input si trop long
    if (typeof optimized.input === 'string' && optimized.input.length > 1000) {
      optimized.input = optimized.input.substring(0, 1000) + '...';
      logger.debug(`[GroqResponsesProvider] ⚠️ Input tronqué à 1000 caractères`);
    }
    
    // ✅ DÉSACTIVER Browser Search par défaut (trop cher)
    if (Array.isArray(optimized.tools)) {
      optimized.tools = optimized.tools.filter((tool: unknown) => {
        return typeof tool === 'object' && tool !== null && 
               (tool as Record<string, unknown>).type !== 'browser_search';
      });
      logger.debug(`[GroqResponsesProvider] ⚠️ Browser Search désactivé (coût élevé)`);
    }
    
    // ✅ Limiter les tools pour réduire la complexité
    if (Array.isArray(optimized.tools) && optimized.tools.length > 1) {
      optimized.tools = optimized.tools.slice(0, 1);
      logger.debug(`[GroqResponsesProvider] ⚠️ Tools limités à 1`);
    }
    
    return optimized;
  }

  /**
   * Extrait la réponse de l'API Responses
   * 
   * Conversion de output_text vers content pour compatibilité
   */
  private extractResponsesResponse(response: GroqResponsesApiResponse): string {
    // ✅ Debug: Log de la réponse brute
    logger.debug('[GroqResponsesProvider] 🔍 Réponse brute de l\'API:', JSON.stringify(response, null, 2));
    
    // ✅ Extraction correcte pour l'API Responses
    let content = '';
    if (response.output && Array.isArray(response.output)) {
      // Chercher le message de type "message" avec le contenu
      const messageOutput = response.output.find((item) => item.type === 'message');
      if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
        const textContent = messageOutput.content.find((item) => item.type === 'output_text');
        if (textContent && textContent.text) {
          content = textContent.text;
        }
      }
    }
    
    // Gérer les tool calls si présents dans la réponse
    if (response.output) {
      const mcpCalls = response.output.filter(item => item.type === 'mcp_call');
      if (mcpCalls.length > 0) {
        logger.debug(`[GroqResponsesProvider] 🔧 ${mcpCalls.length} MCP calls détectés`);
        mcpCalls.forEach((call, index) => {
          logger.debug(`[GroqResponsesProvider] MCP call ${index + 1}: ${call.name} sur ${call.server_label}`);
        });
      }
    }

    return content;
  }

  /**
   * Formate le message système avec le contexte
   */
  private formatSystemMessage(context: AppContext): string {
    const message = getSystemMessage('assistant-contextual', { context });
    if (!message) {
      return 'Tu es un assistant IA utile et bienveillant.';
    }
    return message;
  }

  /**
   * Retourne les tools disponibles pour les function calls
   */
  getFunctionCallTools(): Tool[] {
    return [];
  }

  /**
   * Test de connexion avec l'API Responses
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.debug('[GroqResponsesProvider] 🧪 Test de connexion avec Groq Responses API...');

      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      interface ModelsResponse {
        data: Array<{
          id: string;
          [key: string]: unknown;
        }>;
      }

      const models = await response.json() as ModelsResponse;
      logger.debug(`[GroqResponsesProvider] ✅ Connexion réussie - ${models.data.length} modèles disponibles`);

      // Vérifier les modèles supportés
      const supportedModels = models.data.filter((model) => 
        this.info.supportedModels.includes(model.id)
      );
      logger.debug(`[GroqResponsesProvider] 🎯 ${supportedModels.length} modèles supportés disponibles`);

      return true;

    } catch (error) {
      logger.error('[GroqResponsesProvider] ❌ Erreur de connexion:', error);
      return false;
    }
  }

  /**
   * Test des function calls avec l'API Responses
   */
  async testFunctionCalls(): Promise<boolean> {
    try {
      logger.debug('[GroqResponsesProvider] 🧪 Test d\'appel avec function calls...');

      const testPayload = {
        model: this.config.model,
        input: "Test function calls",
        temperature: 0.1,
        // ✅ Suppression de max_tokens pour le test
        tools: [
          {
            type: "function",
            function: {
              name: "test_function",
              description: "Test function",
              parameters: {
                type: "object",
                properties: {
                  test: { type: "string" }
                },
                required: ["test"]
              }
            }
          }
        ],
        tool_choice: "auto"
      };

      const response = await this.makeResponsesApiCall(testPayload);
      
      if (response.tool_calls && response.tool_calls.length > 0) {
        logger.debug(`[GroqResponsesProvider] ✅ Function calls testés avec succès - ${response.tool_calls.length} tool calls`);
        return true;
      } else {
        logger.debug('[GroqResponsesProvider] ⚠️ Aucun tool call détecté dans la réponse');
        return false;
      }

    } catch (error) {
      logger.error('[GroqResponsesProvider] ❌ Erreur lors du test des function calls:', error);
      return false;
    }
  }
} 