import { BaseProvider, type ProviderCapabilities, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import type { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';
import { getSystemMessage } from '../../templates';
import { systemMessageBuilder } from '../../SystemMessageBuilder';

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
  model: 'openai/gpt-oss-20b', // ✅ Modèle 20B plus stable et disponible
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
  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<any> {
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
      const payload = await this.preparePayload(messages);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : 'No stack trace';
      
      logger.error('[GroqProvider] ❌ Erreur lors de l\'appel:', {
        message: errorMessage,
        stack: stack,
        rawError: error
      });
      
      // Toujours lancer une instance de Error pour une meilleure gestion en amont
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Erreur inattendue dans GroqProvider: ${errorMessage}`);
      }
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
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool' | 'developer',
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

      messages.push(messageObj);

      // ✅ Transformer `tool_results` (si présents sur un message assistant) en messages `tool` séparés
      if (msg.role === 'assistant' && msg.tool_results && msg.tool_results.length > 0) {
        for (const result of (msg.tool_results as any[])) {
          messages.push({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            name: result.name,
            content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content ?? null),
          });
        }
      }
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
  private async preparePayload(messages: any[]) {
    const payload: any = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_completion_tokens: this.config.maxTokens, // ✅ Correction: Groq utilise max_completion_tokens
      top_p: this.config.topP,
      stream: false // ✅ Streaming désactivé dans le provider (géré par la route API)
    };

    // ✅ Debug: Log des messages pour identifier le problème
    logger.dev(`[GroqProvider] 🔍 Messages reçus (${messages.length}):`, 
      messages.map(msg => ({ role: msg.role, hasContent: !!msg.content, contentPreview: msg.content?.substring(0, 50) + '...' }))
    );
    
    // Détecter si un message developer avec des tools est présent
    const hasDeveloperMessageWithTools = messages.some(
      msg => msg.role === 'developer' && msg.content
    );
    
    logger.dev(`[GroqProvider] 🔍 Détection message developer:`, {
      hasDeveloperMessageWithTools,
      developerMessages: messages.filter(msg => msg.role === 'developer').length
    });

    if (hasDeveloperMessageWithTools) {
      payload.tool_choice = 'auto'; // ✅ Permettre à Groq de choisir les tools automatiquement
      payload.parallel_tool_calls = true; // ✅ Forcer l'activation des tool calls parallèles
      payload.max_tokens = Math.max(this.config.maxTokens ?? 0, 4000); // ✅ Augmenter les tokens pour les réponses avec tools
      
      // ✅ Extraire les outils du message developer
      const developerMessage = messages.find(msg => msg.role === 'developer');
      if (developerMessage && developerMessage.content) {
        try {
          // Parser le contenu du message developer pour extraire les outils
          const tools = this.extractToolsFromDeveloperMessage(developerMessage.content);
          if (tools && tools.length > 0) {
            payload.tools = tools;
            logger.dev(`[GroqProvider] 🔧 ${tools.length} outils extraits du message developer`);
          }
        } catch (error) {
          logger.warn(`[GroqProvider] ⚠️ Erreur extraction outils:`, error);
        }
      }
      
      logger.dev(`[GroqProvider] 🔧 Message Developer détecté. Activation des tool calls.`);
      logger.dev(`[GroqProvider] 🔧 Configuration multi-tools: parallel=${payload.parallel_tool_calls}, max_tokens=${payload.max_tokens}`);
    } else {
      payload.tool_choice = 'none';
      logger.dev(`[GroqProvider] 🔒 Aucun message Developer, function calls désactivés`);
    }

    // Ajouter les paramètres spécifiques à Groq selon les capacités du modèle
    const { modelSupportsServiceTier, modelSupportsParallelToolCalls, modelSupportsReasoningEffort } = await import('@/constants/groqModels');
    
    if (this.config.serviceTier && modelSupportsServiceTier(this.config.model)) {
      payload.service_tier = this.config.serviceTier;
    }

    if (this.config.parallelToolCalls && hasDeveloperMessageWithTools && modelSupportsParallelToolCalls(this.config.model)) {
      payload.parallel_tool_calls = this.config.parallelToolCalls;
    }

    if (this.config.reasoningEffort && modelSupportsReasoningEffort(this.config.model)) {
      payload.reasoning_effort = this.config.reasoningEffort;
    }
    
    return payload;
  }

  /**
   * Extrait les outils du message developer
   */
  private extractToolsFromDeveloperMessage(content: string): any[] {
    try {
      logger.dev(`[GroqProvider] 🔍 Extraction outils depuis message developer (${content.length} chars)`);
      
      // Le message developer contient les outils dans le format <|tool_code|>...</|tool_code|>
      const toolCodeMatch = content.match(/<\|tool_code\|>([\s\S]*?)<\|\/tool_code\|>/);
      if (!toolCodeMatch) {
        logger.dev(`[GroqProvider] ⚠️ Aucun bloc tool_code trouvé dans le message developer`);
        return [];
      }

      const toolCodeContent = toolCodeMatch[1].trim();
      logger.dev(`[GroqProvider] 🔍 Contenu tool_code extrait (${toolCodeContent.length} chars):`, toolCodeContent.substring(0, 200) + '...');
      
      const tools: any[] = [];

      // Parser chaque outil (séparés par des lignes vides)
      const toolSections = toolCodeContent.split(/\n\s*\n/);
      logger.dev(`[GroqProvider] 🔍 ${toolSections.length} sections d'outils trouvées`);
      
      for (let i = 0; i < toolSections.length; i++) {
        const section = toolSections[i];
        const lines = section.trim().split('\n');
        if (lines.length < 3) {
          logger.dev(`[GroqProvider] ⚠️ Section ${i} ignorée (trop courte: ${lines.length} lignes)`);
          continue;
        }

        const nameMatch = lines[0].match(/^#\s*(\w+)/);
        const descMatch = lines[1].match(/^#\s*Description:\s*(.+)/);
        const paramsMatch = lines.find(line => line.startsWith('# Parameters:'));

        if (nameMatch && descMatch && paramsMatch) {
          const name = nameMatch[1];
          const description = descMatch[1];
          
          // Trouver les paramètres JSON
          const paramsStartIndex = lines.findIndex(line => line.startsWith('# Parameters:'));
          if (paramsStartIndex >= 0 && paramsStartIndex + 1 < lines.length) {
            const paramsJson = lines.slice(paramsStartIndex + 1).join('\n').trim();
            try {
              const parameters = JSON.parse(paramsJson);
              
              tools.push({
                type: 'function',
                function: {
                  name,
                  description,
                  parameters
                }
              });
              
              logger.dev(`[GroqProvider] ✅ Outil ${name} extrait avec succès`);
            } catch (parseError) {
              logger.warn(`[GroqProvider] ⚠️ Erreur parsing paramètres pour ${name}:`, parseError);
            }
          }
        } else {
          logger.dev(`[GroqProvider] ⚠️ Section ${i} ignorée (format invalide)`, {
            hasName: !!nameMatch,
            hasDesc: !!descMatch,
            hasParams: !!paramsMatch,
            firstLine: lines[0]
          });
        }
      }

      logger.dev(`[GroqProvider] 🎯 ${tools.length} outils extraits au total`);
      return tools;
    } catch (error) {
      logger.warn(`[GroqProvider] ⚠️ Erreur extraction outils:`, error);
      return [];
    }
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

    const responseData = await response.json();
    logger.dev('[GroqProvider] 🔍 Réponse brute de l\'API Groq:', {
      responseData: responseData,
      responseType: typeof responseData,
      hasChoices: 'choices' in responseData,
      choices: responseData?.choices,
      hasContent: responseData?.choices?.[0]?.message?.content,
      content: responseData?.choices?.[0]?.message?.content?.substring(0, 100) + '...'
    });
    
    return responseData;
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

    // ✅ Ajouter le reasoning si présent
    if (choice?.message?.reasoning) {
      result.reasoning = choice.message.reasoning;
      logger.dev(`[GroqProvider] 🧠 Reasoning détecté (${result.reasoning.length} chars)`);
    }

    return result;
  }

  /**
   * Formate le message système avec le contexte
   */
  private formatSystemMessage(context: AppContext): string {
    // Si le contexte contient déjà des instructions système (depuis l'orchestrateur)
    if (context.content && context.content.trim().length > 0) {
      logger.dev(`[GroqProvider] 🎯 Utilisation des instructions système fournies (${context.content.length} chars)`);
      return context.content;
    }

    // Fallback vers le système de templates existant
    const message = getSystemMessage('assistant-contextual', { context });
    if (!message) {
      return 'Tu es un assistant IA utile et bienveillant.';
    }
    
    logger.dev(`[GroqProvider] ⚙️ Utilisation du template par défaut`);
    return message;
  }

  /**
   * Retourne les tools disponibles pour les function calls
   */
  getFunctionCallTools(): any[] {
    try {
      // Importer dynamiquement les tools OpenAPI V2
      const { getOpenAPIV2Tools } = require('@/services/openApiToolsGenerator');
      const tools = getOpenAPIV2Tools();
      
      logger.dev(`[GroqProvider] 🔧 ${tools.length} tools OpenAPI V2 chargés`);
      return tools;
    } catch (error) {
      logger.warn('[GroqProvider] ⚠️ Erreur lors du chargement des tools OpenAPI V2:', error);
      return [];
    }
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