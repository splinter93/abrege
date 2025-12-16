/**
 * SessionTitleGenerator
 * 
 * Service responsable de la génération automatique de titres pour les sessions de chat
 * via l'API Groq (modèle gpt-oss-20b).
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - TypeScript strict (0 any)
 * - Service isolé (< 300 lignes)
 * - Gestion erreurs robuste (3 niveaux)
 * - Logs structurés avec contexte
 * - Performance optimisée (timeout 10s)
 * - Sécurité (sanitization, validation)
 * 
 * @example
 * const generator = new SessionTitleGenerator();
 * const result = await generator.generateTitle({
 *   sessionId: 'uuid',
 *   userMessage: 'Comment créer une API REST avec Node.js ?',
 *   agentName: 'Assistant Code'
 * });
 */

import { simpleLogger as logger } from '@/utils/logger';

// ✅ Interfaces explicites (TypeScript strict)
export interface TitleGenerationOptions {
  sessionId: string;
  userMessage: string;
  agentName?: string;
  maxLength?: number; // default: 60
}

export interface TitleGenerationResult {
  success: boolean;
  title?: string;
  error?: string;
  executionTime?: number;
}

interface GroqChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature: number;
  max_tokens: number;
  top_p: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
}

interface GroqChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
      reasoning?: string; // ✅ Champ optionnel pour modèles avec reasoning
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

// ✅ Constantes configuration
const GROQ_CONFIG = {
  baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
  model: 'openai/gpt-oss-20b', // ✅ Stable, rapide, gratuit
  temperature: 0.7, // Créatif mais cohérent
  maxTokens: 500, // ✅ Large budget pour laisser de la place au reasoning + titre
  topP: 0.9,
  reasoningEffort: 'low', // ✅ Réduire le reasoning pour avoir le contenu
  timeout: 10000, // 10s (Groq ultra-rapide)
  defaultMaxLength: 40 // ✅ Réduit pour sidebar étroite
} as const;

const SYSTEM_PROMPT = `Crée un titre ULTRA-COURT (max 35 caractères) pour cette conversation.
Style: mots-clés essentiels uniquement, PAS de phrase complète.
Format: "Sujet principal" ou "Sujet + contexte bref"
Exemples corrects: "API REST Node.js" "Recette crêpes" "Erreur Python import"
Exemples incorrects: "Comment créer une API" "Je veux faire des crêpes"
Français, concis, sans ponctuation finale.`.trim();

/**
 * Générateur de titres pour sessions de chat
 * 
 * Pattern singleton recommandé pour réutilisation
 */
export class SessionTitleGenerator {
  private readonly apiKey: string;

  constructor() {
    // ✅ Validation clé API au constructor (fail fast)
    const key = process.env.GROQ_API_KEY;
    
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('[SessionTitleGenerator] GROQ_API_KEY manquante ou invalide');
    }
    
    this.apiKey = key;
  }

  /**
   * Génère un titre pour une session de chat
   * 
   * @param options - Options de génération
   * @returns Résultat avec titre ou erreur
   * 
   * @example
   * const result = await generator.generateTitle({
   *   sessionId: 'uuid',
   *   userMessage: 'Comment apprendre TypeScript ?'
   * });
   * 
   * if (result.success) {
   *   console.log(`Titre: ${result.title}`);
   * }
   */
  async generateTitle(options: TitleGenerationOptions): Promise<TitleGenerationResult> {
    const startTime = Date.now();
    const { sessionId, userMessage, agentName, maxLength = GROQ_CONFIG.defaultMaxLength } = options;

    // ✅ Validation inputs
    if (!sessionId || sessionId.trim().length === 0) {
      return {
        success: false,
        error: 'sessionId requis',
        executionTime: Date.now() - startTime
      };
    }

    if (!userMessage || userMessage.trim().length === 0) {
      return {
        success: false,
        error: 'userMessage requis',
        executionTime: Date.now() - startTime
      };
    }

    logger.info('[SessionTitleGenerator] 🎯 Génération titre démarrée', {
      sessionId,
      messageLength: userMessage.length,
      agentName,
      maxLength
    });

    try {
      // Construire le prompt user
      const userPrompt = this.buildUserPrompt(userMessage, agentName);
      
      // Appeler Groq
      const rawTitle = await this.callGroq(userPrompt, sessionId);
      
      // Sanitize et valider
      const sanitizedTitle = this.sanitizeTitle(rawTitle, maxLength);
      
      const executionTime = Date.now() - startTime;
      
      logger.info('[SessionTitleGenerator] ✅ Titre généré avec succès', {
        sessionId,
        title: sanitizedTitle,
        executionTime
      });

      return {
        success: true,
        title: sanitizedTitle,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('[SessionTitleGenerator] ❌ Erreur génération titre', {
        sessionId,
        error: errorMessage,
        executionTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * Construit le prompt utilisateur avec contexte optionnel agent
   * 
   * @private
   */
  private buildUserPrompt(userMessage: string, agentName?: string): string {
    if (agentName) {
      return `Message de l'utilisateur (agent: ${agentName}):\n${userMessage}`;
    }
    
    return `Message de l'utilisateur:\n${userMessage}`;
  }

  /**
   * Appelle l'API Groq avec gestion timeout
   * 
   * @private
   * @throws {Error} Si timeout ou erreur réseau
   */
  private async callGroq(userPrompt: string, sessionId: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GROQ_CONFIG.timeout);

    try {
      const payload: GroqChatCompletionRequest = {
        model: GROQ_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: GROQ_CONFIG.temperature,
        max_tokens: GROQ_CONFIG.maxTokens,
        top_p: GROQ_CONFIG.topP,
        reasoning_effort: GROQ_CONFIG.reasoningEffort
      };

      logger.dev('[SessionTitleGenerator] 📡 Appel API Groq', {
        sessionId,
        model: GROQ_CONFIG.model,
        messageLength: userPrompt.length
      });

      const response = await fetch(GROQ_CONFIG.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // ✅ Gestion erreurs HTTP
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[SessionTitleGenerator] ❌ Erreur HTTP Groq', {
          sessionId,
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText.substring(0, 500) // Premier 500 chars
        });
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as GroqChatCompletionResponse;

      // ✅ Debug: Logger la réponse complète pour diagnostiquer
      logger.dev('[SessionTitleGenerator] 📦 Réponse Groq brute:', {
        sessionId,
        hasChoices: !!data?.choices,
        choicesLength: data?.choices?.length,
        firstChoice: data?.choices?.[0],
        rawData: JSON.stringify(data).substring(0, 500) // Premier 500 chars
      });

      // ✅ Validation réponse
      const message = data?.choices?.[0]?.message;
      const content = message?.content;
      const reasoning = message?.reasoning;

      // Si content vide mais reasoning existe, extraire le titre du reasoning
      if (!content || content.trim().length === 0) {
        if (reasoning && reasoning.trim().length > 0) {
          logger.warn('[SessionTitleGenerator] ⚠️ Content vide, utilisation du reasoning', {
            sessionId,
            reasoningLength: reasoning.length,
            finishReason: data.choices?.[0]?.finish_reason
          });
          
          // Essayer d'extraire un titre du reasoning (première phrase)
          const extractedTitle = reasoning.split(/[.!?\n]/)[0].trim();
          return extractedTitle || 'Nouvelle conversation';
        }

        logger.error('[SessionTitleGenerator] ❌ Ni content ni reasoning', {
          sessionId,
          receivedData: data,
          hasChoices: !!data?.choices,
          choicesLength: data?.choices?.length || 0,
          firstChoiceExists: !!data?.choices?.[0],
          finishReason: data.choices?.[0]?.finish_reason
        });
        throw new Error('Réponse Groq invalide ou vide');
      }

      return content;

    } catch (error) {
      clearTimeout(timeoutId);

      // ✅ Gestion erreur abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout après ${GROQ_CONFIG.timeout}ms`);
      }

      // Re-throw autres erreurs
      throw error;
    }
  }

  /**
   * Sanitize et valide le titre généré
   * 
   * Règles:
   * - Trim espaces
   * - Supprime guillemets début/fin
   * - Supprime ponctuation finale (. ! ?)
   * - Truncate à maxLength
   * - Fallback si vide
   * 
   * @private
   */
  private sanitizeTitle(rawTitle: string, maxLength: number): string {
    let title = rawTitle.trim();

    // Supprimer guillemets entourants
    if ((title.startsWith('"') && title.endsWith('"')) || 
        (title.startsWith("'") && title.endsWith("'"))) {
      title = title.slice(1, -1).trim();
    }

    // Supprimer ponctuation finale
    title = title.replace(/[.!?]+$/, '').trim();

    // Truncate si trop long (en respectant les mots)
    if (title.length > maxLength) {
      title = title.substring(0, maxLength);
      
      // Couper au dernier espace pour ne pas couper un mot
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.7) { // Garder au moins 70% du texte
        title = title.substring(0, lastSpace);
      }
      
      // Ajouter ellipse si coupé
      title = title.trim() + '…';
    }

    // Fallback si vide après sanitization
    if (title.length === 0) {
      return 'Nouvelle conversation';
    }

    // Capitalize première lettre
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return title;
  }
}

// ✅ Export singleton pour réutilisation (pattern recommandé)
let instance: SessionTitleGenerator | null = null;

/**
 * Récupère l'instance singleton du générateur
 * 
 * @returns Instance unique du générateur
 */
export function getSessionTitleGenerator(): SessionTitleGenerator {
  if (!instance) {
    instance = new SessionTitleGenerator();
  }
  return instance;
}

