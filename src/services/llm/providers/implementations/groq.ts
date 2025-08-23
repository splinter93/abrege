import { BaseProvider, type ProviderCapabilities, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import type { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';
import { getSystemMessage } from '../../templates';

/**
 * Interface étendue pour le provider Groq qui retourne la structure attendue par l'orchestrateur
 */
interface GroqProviderResponse {
  content: string;
  tool_calls?: any[];
  model?: string;
  usage?: any;
}

/**
 * Configuration spécifique à Groq
 */
interface GroqConfig extends ProviderConfig {
  // Spécifique à Groq
  serviceTier?: 'auto' | 'on_demand' | 'flex' | 'performance';
  parallelToolCalls?: boolean;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  
  // Audio/Whisper
  audioModel?: 'whisper-large-v3' | 'whisper-large-v3-turbo';
  audioResponseFormat?: 'json' | 'verbose_json' | 'text';
  audioTimestampGranularities?: ('word' | 'segment')[];
}

/**
 * Informations sur Groq
 */
const GROQ_INFO: ProviderInfo = {
  id: 'groq',
  name: 'Groq',
  version: '1.0.0',
  description: 'Ultra-fast inference platform with GPT-OSS 120B, Whisper, and other models',
  capabilities: {
    functionCalls: true,
    streaming: true,
    reasoning: true,
    codeExecution: true,
    webSearch: false,
    structuredOutput: true,
    audioTranscription: true, // ✅ Nouvelle capacité
    audioTranslation: true    // ✅ Nouvelle capacité
  },
  supportedModels: [
    'openai/gpt-oss-20b', // ✅ Modèle plus stable
    'openai/gpt-oss-120b',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-version',
    'mixtral-8x7b-32768',
    // ✅ Modèles Whisper
    'whisper-large-v3',
    'whisper-large-v3-turbo'
  ],
  pricing: {
    input: '$0.15/1M tokens',
    output: '$0.75/1M tokens',
    audio: '$0.04-0.111/hour' // ✅ Pricing audio
  }
};

/**
 * Configuration par défaut de Groq
 */
const DEFAULT_GROQ_CONFIG: GroqConfig = {
  // Base
  apiKey: process.env.GROQ_API_KEY || '',
  baseUrl: 'https://api.groq.com/openai/v1',
  timeout: 30000,
  
  // LLM
  model: 'openai/gpt-oss-120b', // 🚀 Modèle 120B pour plus de puissance
  temperature: 0.7,
  maxTokens: 8000, // ✅ Augmenté pour plus de réponses
  topP: 0.9,
  
  // Features
  supportsFunctionCalls: true,
  supportsStreaming: false, // Streaming géré par la route API
  supportsReasoning: true,
  
  // Monitoring
  enableLogging: true,
  enableMetrics: true,
  
  // Groq spécifique
  serviceTier: 'on_demand', // ✅ Gratuit au lieu de 'auto' (payant)
  parallelToolCalls: true,
  reasoningEffort: 'low', // ✅ Réduit le reasoning pour plus de réponses
  
  // ✅ Configuration audio par défaut
  audioModel: 'whisper-large-v3-turbo',
  audioResponseFormat: 'verbose_json',
  audioTimestampGranularities: ['word', 'segment']
};

/**
 * Provider Groq pour l'API Groq
 */
export class GroqProvider extends BaseProvider implements LLMProvider {
  readonly info = GROQ_INFO;
  readonly config: GroqConfig;

  // Implémentation de LLMProvider
  get name(): string {
    return this.info.name;
  }

  get id(): string {
    return this.info.id;
  }

  constructor(customConfig?: Partial<GroqConfig>) {
    super();
    this.config = { ...DEFAULT_GROQ_CONFIG, ...customConfig };
  }

  /**
   * Vérifie si Groq est disponible
   */
  isAvailable(): boolean {
    return this.validateConfig();
  }

  /**
   * Valide la configuration de Groq
   */
  validateConfig(): boolean {
    if (!this.validateBaseConfig()) {
      logger.error('[GroqProvider] ❌ Configuration de base invalide');
      return false;
    }

    if (!this.config.model) {
      logger.error('[GroqProvider] ❌ Modèle non spécifié');
      return false;
    }

    if (!this.info.supportedModels.includes(this.config.model)) {
      logger.warn(`[GroqProvider] ⚠️ Modèle ${this.config.model} non officiellement supporté`);
    }

    logger.dev('[GroqProvider] ✅ Configuration validée');
    return true;
  }

  /**
   * Effectue un appel à l'API Groq avec support des function calls
   */
  async call(message: string, context: AppContext, history: ChatMessage[], tools?: any[]): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Groq provider non configuré');
    }

    try {
      logger.dev(`[GroqProvider] 🚀 Appel avec modèle: ${this.config.model}`);

      // ✅ Vérifier si le streaming est activé
      if (this.config.supportsStreaming) {
        throw new Error('Streaming non supporté dans le provider Groq - utilisez la route API directement');
      }

      // Préparer les messages
      const messages = this.prepareMessages(message, context, history);
      
      // Préparer le payload (sans streaming)
      const payload = await this.preparePayload(messages, tools);
      payload.stream = false; // Forcer le mode non-streaming
      
      // Effectuer l'appel API
      const response = await this.makeApiCall(payload);
      
      // Extraire la réponse
      const result = this.extractResponse(response);
      
      logger.dev('[GroqProvider] ✅ Appel réussi');
      
      // 🎯 Retourner l'objet complet avec la structure attendue par l'orchestrateur
      return {
        content: result.content || '',
        tool_calls: result.tool_calls || [],
        model: result.model,
        usage: result.usage
      };

    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur lors de l\'appel:', error);
      throw error;
    }
  }

  /**
   * Prépare les messages pour l'API
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[]) {
    const messages: Array<any> = [];

    // Message système avec contexte
    const systemContent = this.formatSystemMessage(context);
    messages.push({
      role: 'system',
      content: systemContent
    });

    // Historique des messages
    for (const msg of history) {
      const messageObj: any = {
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: msg.content
      };

      // ✅ Gérer les tool calls pour les messages assistant
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        messageObj.tool_calls = msg.tool_calls;
      }

      // ✅ Gérer les tool results pour les messages tool
      if (msg.role === 'tool' && msg.tool_call_id) {
        messageObj.tool_call_id = msg.tool_call_id;
        if (msg.name) {
          messageObj.name = msg.name;
        }
      }

      // ✅ Gérer les tool results si présents
      if (msg.tool_results && msg.tool_results.length > 0) {
        messageObj.tool_results = msg.tool_results;
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
   * Prépare le payload pour l'API Groq avec support des tools
   */
  private async preparePayload(messages: any[], tools?: any[]) {
    const payload: any = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_completion_tokens: this.config.maxTokens, // ✅ Correction: Groq utilise max_completion_tokens
      top_p: this.config.topP,
      stream: false // ✅ Streaming désactivé dans le provider (géré par la route API)
    };

    // 🔍 DEBUG: Log des tools reçus
    logger.dev(`[GroqProvider] 🔍 Tools reçus:`, {
      toolsCount: tools?.length || 0,
      tools: tools?.slice(0, 2) || [], // Log des 2 premiers tools
      hasTools: !!tools && tools.length > 0
    });

    // Ajouter les tools si disponibles (avec validation moins stricte)
    if (tools && tools.length > 0) {
      // 🔧 VALIDATION DES TOOLS : s'assurer que les paramètres sont un schéma d'objet valide
      const validatedTools = tools.filter((tool: any) => {
        // Vérification de la structure de base
        if (!tool || typeof tool !== 'object') {
          logger.warn(`[GroqProvider] ⚠️ Tool invalide ignoré:`, tool);
          return false;
        }
        
        // Vérification de la structure function
        if (!tool.function || typeof tool.function !== 'object') {
          logger.warn(`[GroqProvider] ⚠️ Tool sans fonction ignoré:`, tool);
          return false;
        }
        
        if (!tool.function.name || typeof tool.function.name !== 'string') {
          logger.warn(`[GroqProvider] ⚠️ Tool sans nom de fonction ignoré:`, tool);
          return false;
        }
        // PARAMÈTRES OBLIGATOIRES : s'assurer qu'il s'agit d'un schéma JSON d'objet compréhensible
        const params = tool.function.parameters;
        if (!params || params.type !== 'object' || typeof params.properties !== 'object' || !Array.isArray(params.required)) {
          logger.warn(`[GroqProvider] ⚠️ Tool avec paramètres invalides ignoré: ${tool.function.name}`, params);
          return false;
        }
        
        return true;
      });
      
      if (validatedTools.length > 0) {
        payload.tools = validatedTools;
        payload.tool_choice = 'auto'; // ✅ Permettre à Groq de choisir les tools automatiquement
        
        // 🔧 CONFIGURATION OPTIMISÉE POUR MULTI-TOOL CALLS
        payload.parallel_tool_calls = true; // ✅ Forcer l'activation des tool calls parallèles
        payload.max_tokens = Math.max(this.config.maxTokens, 4000); // ✅ Augmenter les tokens pour les réponses avec tools
        
        logger.dev(`[GroqProvider] 🔧 ${validatedTools.length}/${tools.length} tools validés pour les function calls`);
        logger.dev(`[GroqProvider] 🔧 Configuration multi-tools: parallel=${payload.parallel_tool_calls}, max_tokens=${payload.max_tokens}`);
        
        // 🔧 DÉBOGAGE: Log du premier tool validé
        logger.dev(`[GroqProvider] 🔍 Premier tool validé:`, {
          name: validatedTools[0].function.name,
          description: validatedTools[0].function.description?.substring(0, 100) || 'Pas de description',
          hasParameters: !!validatedTools[0].function.parameters || 'Pas de paramètres'
        });
        
        // 🔍 DEBUG: Log du payload final avec tools
        logger.dev(`[GroqProvider] 📤 Payload final avec tools:`, {
          hasTools: !!payload.tools,
          toolsCount: payload.tools?.length || 0,
          toolChoice: payload.tool_choice,
          parallelToolCalls: payload.parallel_tool_calls
        });
      } else {
        logger.warn(`[GroqProvider] ⚠️ Aucun tool valide trouvé, appel sans tools`);
      }
    }

    // Ajouter les paramètres spécifiques à Groq
    if (this.config.serviceTier) {
      payload.service_tier = this.config.serviceTier;
    }

    if (this.config.parallelToolCalls) {
      payload.parallel_tool_calls = this.config.parallelToolCalls;
    }

    if (this.config.reasoningEffort) {
      payload.reasoning_effort = this.config.reasoningEffort;
    }

    // Si aucun tool valide, désactiver explicitement les function calls
    if (!payload.tools || payload.tools.length === 0) {
      // 🔧 CORRECTION: Vérifier si FORCE_TOOLS_ON est activé
      const forceToolsOn = process.env.FORCE_TOOLS_ON === 'true';
      
      if (forceToolsOn) {
        // ✅ FORCER l'activation des tools même sans tools fournis
        logger.warn(`[GroqProvider] ⚠️ FORCE_TOOLS_ON=true - Forcer l'activation des tools sans validation`);
        payload.tool_choice = 'auto'; // Permettre au modèle de choisir automatiquement
        
        // 🔧 CORRECTION: Fournir des tools réels au lieu d'un tool factice
        // Importer et utiliser les tools depuis AgentApiV2Tools
        try {
          const { agentApiV2Tools } = await import('@/services/agentApiV2Tools');
          await agentApiV2Tools.waitForInitialization();
          
          // Récupérer tous les tools disponibles
          const allTools = agentApiV2Tools.getToolsForFunctionCalling([]);
          
          if (allTools && allTools.length > 0) {
            payload.tools = allTools;
            logger.dev(`[GroqProvider] 🔧 ${allTools.length} tools réels chargés pour FORCE_TOOLS_ON`);
          } else {
            // Fallback: créer un tool factice mais plus réaliste
            payload.tools = [{
              type: 'function',
              function: {
                name: 'list_classeurs',
                description: 'Lister tous les classeurs disponibles',
                parameters: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Terme de recherche pour filtrer les classeurs'
                    },
                    top_n: {
                      type: 'number',
                      description: 'Nombre maximum de classeurs à retourner',
                      default: 10
                    }
                  },
                  required: []
                }
              }
            }];
            logger.dev(`[GroqProvider] 🔧 Tool factice créé pour FORCE_TOOLS_ON`);
          }
        } catch (error) {
          logger.warn(`[GroqProvider] ⚠️ Erreur lors du chargement des tools: ${error}`);
          // Fallback: tool factice minimal
          payload.tools = [{
            type: 'function',
            function: {
              name: 'force_tools_enabled',
              description: 'Tool factice pour forcer l\'activation des function calls',
              parameters: {
                type: 'object',
                properties: {},
                required: []
              }
            }
          }];
        }
        
        logger.dev(`[GroqProvider] 🔧 Tools forcés activés avec ${payload.tools.length} tools`);
      } else {
        // Comportement normal : désactiver les function calls
        payload.tool_choice = 'none';
        delete payload.parallel_tool_calls;
        delete payload.tools;
        logger.dev(`[GroqProvider] 🔒 Aucun tool, function calls désactivés`);
      }
    }
    
    return payload;
  }

  /**
   * Effectue l'appel API à Groq
   */
  private async makeApiCall(payload: any) {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    // ✅ Gestion spéciale pour le streaming
    if (payload.stream) {
      // Pour le streaming, on ne peut pas parser la réponse comme du JSON
      // Le streaming est géré directement dans la route API
      throw new Error('Streaming non supporté dans le provider Groq - utilisez la route API directement');
    }

    return await response.json();
  }

  /**
   * Extrait la réponse de l'API Groq avec support des tool calls
   */
  private extractResponse(response: any): any {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Réponse invalide de Groq API');
    }

    const choice = response.choices[0];
    const result: any = {
      content: choice?.message?.content ?? '',
      model: response.model,
      usage: response.usage
    };

    // ✅ Ajouter les tool calls si présents
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      result.tool_calls = choice.message.tool_calls;
      logger.dev(`[GroqProvider] 🔧 ${result.tool_calls.length} tool calls détectés`);
      
      result.tool_calls.forEach((toolCall: any, index: number) => {
        logger.dev(`[GroqProvider] Tool call ${index + 1}: ${toolCall.function.name}`);
      });
    }

    return result;
  }

  /**
   * Formate le message système avec le contexte
   */
  private formatSystemMessage(context: AppContext): string {
    // Utiliser le système de templates
    const message = getSystemMessage('assistant-contextual', { context });
    if (!message) {
      return 'Tu es un assistant IA utile et bienveillant.';
    }
    return message;
  }

  /**
   * Retourne les tools disponibles pour les function calls
   */
  getFunctionCallTools(): any[] {
    // Pour l'instant, retourner un tableau vide
    // Les tools seront injectés depuis l'extérieur via AgentApiV2Tools
    return [];
  }

  /**
   * Test de connexion avec Groq
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.dev('[GroqProvider] 🧪 Test de connexion avec Groq...');
      
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const models = await response.json();
      logger.dev(`[GroqProvider] ✅ Connexion réussie - ${models.data.length} modèles disponibles`);
      
      // Vérifier si GPT OSS est disponible
      const gptOssModels = models.data.filter((model: any) => 
        model.id.includes('gpt-oss')
      );
      
      logger.dev(`[GroqProvider] 🎯 ${gptOssModels.length} modèles GPT OSS disponibles`);
      
      return true;
    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur de connexion:', error);
      return false;
    }
  }

  /**
   * Test d'appel avec function calls
   */
  async testFunctionCalls(tools: any[]): Promise<boolean> {
    try {
      logger.dev('[GroqProvider] 🧪 Test d\'appel avec function calls...');
      
      const messages = [
        {
          role: 'system',
          content: getSystemMessage('assistant-tools')
        },
        {
          role: 'user',
          content: 'Crée une note intitulée "Test Groq OpenAPI" dans le classeur "main-notebook"'
        }
      ];

      const payload = {
        model: this.config.model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: this.config.temperature,
        max_completion_tokens: this.config.maxTokens,
        top_p: this.config.topP
      };

      const response = await this.makeApiCall(payload);
      const result = this.extractResponse(response);
      
      if (result.tool_calls && result.tool_calls.length > 0) {
        logger.dev(`[GroqProvider] ✅ Function calls testés avec succès - ${result.tool_calls.length} tool calls`);
        return true;
      } else {
        logger.dev('[GroqProvider] ⚠️ Aucun tool call détecté dans la réponse');
        return false;
      }
    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur lors du test des function calls:', error);
      return false;
    }
  }

  // ✅ MÉTHODES AUDIO WHISPER

  /**
   * Transcrit un fichier audio en texte
   * @param file - Fichier audio (Buffer ou File)
   * @param options - Options de transcription
   */
  async transcribeAudio(
    file: Buffer | File,
    options: {
      language?: string;
      prompt?: string;
      responseFormat?: 'json' | 'verbose_json' | 'text';
      timestampGranularities?: ('word' | 'segment')[];
      temperature?: number;
    } = {}
  ): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Groq provider non configuré');
    }

    try {
      logger.dev(`[GroqProvider] 🎤 Transcription audio avec ${this.config.audioModel}`);

      // Préparer le FormData
      const formData = new FormData();
      
      // Ajouter le fichier audio
      if (file instanceof Buffer) {
        const blob = new Blob([file], { type: 'audio/m4a' });
        formData.append('file', blob, 'audio.m4a');
      } else {
        formData.append('file', file);
      }

      // Ajouter les paramètres
      formData.append('model', this.config.audioModel || 'whisper-large-v3-turbo');
      formData.append('temperature', String(options.temperature || 0));
      formData.append('response_format', options.responseFormat || this.config.audioResponseFormat || 'verbose_json');

      if (options.language) {
        formData.append('language', options.language);
      }

      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      if (options.timestampGranularities && options.timestampGranularities.length > 0) {
        options.timestampGranularities.forEach(granularity => {
          formData.append('timestamp_granularities[]', granularity);
        });
      }

      // Effectuer l'appel API
      const response = await fetch(`${this.config.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur transcription: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      logger.dev('[GroqProvider] ✅ Transcription audio réussie');
      
      return result;

    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur lors de la transcription audio:', error);
      throw error;
    }
  }

  /**
   * Traduit un fichier audio en anglais
   * @param file - Fichier audio (Buffer ou File)
   * @param options - Options de traduction
   */
  async translateAudio(
    file: Buffer | File,
    options: {
      prompt?: string;
      responseFormat?: 'json' | 'verbose_json' | 'text';
      timestampGranularities?: ('word' | 'segment')[];
      temperature?: number;
    } = {}
  ): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Groq provider non configuré');
    }

    try {
      logger.dev(`[GroqProvider] 🌍 Traduction audio avec ${this.config.audioModel}`);

      // Préparer le FormData
      const formData = new FormData();
      
      // Ajouter le fichier audio
      if (file instanceof Buffer) {
        const blob = new Blob([file], { type: 'audio/m4a' });
        formData.append('file', blob, 'audio.m4a');
      } else {
        formData.append('file', file);
      }

      // Ajouter les paramètres
      formData.append('model', this.config.audioModel || 'whisper-large-v3');
      formData.append('temperature', String(options.temperature || 0));
      formData.append('response_format', options.responseFormat || this.config.audioResponseFormat || 'verbose_json');

      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      if (options.timestampGranularities && options.timestampGranularities.length > 0) {
        options.timestampGranularities.forEach(granularity => {
          formData.append('timestamp_granularities[]', granularity);
        });
      }

      // Effectuer l'appel API
      const response = await fetch(`${this.config.baseUrl}/audio/translations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur traduction: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      logger.dev('[GroqProvider] ✅ Traduction audio réussie');
      
      return result;

    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur lors de la traduction audio:', error);
      throw error;
    }
  }

  /**
   * Transcrit un fichier audio depuis une URL
   * @param url - URL du fichier audio
   * @param options - Options de transcription
   */
  async transcribeAudioFromUrl(
    url: string,
    options: {
      language?: string;
      prompt?: string;
      responseFormat?: 'json' | 'verbose_json' | 'text';
      timestampGranularities?: ('word' | 'segment')[];
      temperature?: number;
    } = {}
  ): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Groq provider non configuré');
    }

    try {
      logger.dev(`[GroqProvider] 🎤 Transcription audio depuis URL avec ${this.config.audioModel}`);

      // Préparer le payload
      const payload: any = {
        model: this.config.audioModel || 'whisper-large-v3-turbo',
        url: url,
        temperature: options.temperature || 0,
        response_format: options.responseFormat || this.config.audioResponseFormat || 'verbose_json'
      };

      if (options.language) {
        payload.language = options.language;
      }

      if (options.prompt) {
        payload.prompt = options.prompt;
      }

      if (options.timestampGranularities && options.timestampGranularities.length > 0) {
        payload.timestamp_granularities = options.timestampGranularities;
      }

      // Effectuer l'appel API
      const response = await fetch(`${this.config.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur transcription URL: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      logger.dev('[GroqProvider] ✅ Transcription audio depuis URL réussie');
      
      return result;

    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur lors de la transcription audio depuis URL:', error);
      throw error;
    }
  }

  /**
   * Test de connexion audio avec Whisper
   */
  async testAudioConnection(): Promise<boolean> {
    try {
      logger.dev('[GroqProvider] 🧪 Test de connexion audio avec Whisper...');
      
      // Créer un fichier audio de test minimal (silence)
      const testAudioBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x24, 0x00, 0x00, 0x00, // Size
        0x57, 0x41, 0x56, 0x45, // WAVE
        0x66, 0x6D, 0x74, 0x20, // fmt
        0x10, 0x00, 0x00, 0x00, // fmt chunk size
        0x01, 0x00, // Audio format (PCM)
        0x01, 0x00, // Channels (mono)
        0x44, 0xAC, 0x00, 0x00, // Sample rate (44100)
        0x88, 0x58, 0x01, 0x00, // Byte rate
        0x02, 0x00, // Block align
        0x10, 0x00, // Bits per sample
        0x64, 0x61, 0x74, 0x61, // data
        0x00, 0x00, 0x00, 0x00  // data size (0 bytes)
      ]);

      const result = await this.transcribeAudio(testAudioBuffer, {
        responseFormat: 'text',
        temperature: 0
      });

      logger.dev('[GroqProvider] ✅ Connexion audio réussie');
      return true;

    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur de connexion audio:', error);
      return false;
    }
  }
} 