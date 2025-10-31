/**
 * Service pour construire le contexte LLM unifié
 * Extrait de ChatFullscreenV2.tsx pour séparation des responsabilités
 * 
 * Responsabilités:
 * - Construire contexte LLM pour l'orchestrateur
 * - Merger session, agent, UI context, notes
 * - Validation du contexte
 */

import type { LLMContext } from '@/hooks/useLLMContext';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Note attachée à un message
 */
export interface Note {
  id: string;
  slug: string;
  title: string;
  markdown_content: string;
  updated_at?: string;  // Date de dernière modification (optionnel)
  created_at?: string;  // Date de création (optionnel)
}

/**
 * Options pour construire le contexte LLM
 */
export interface BuildContextOptions {
  sessionId: string;
  agentId?: string | null;
  notes?: Note[];
  mentions?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number; created_at?: string }>; // ✅ NOUVEAU: Mentions légères
  llmContext: LLMContext;
}

/**
 * Contexte LLM unifié pour l'orchestrateur
 */
export interface LLMContextForOrchestrator {
  type: 'chat_session';
  id: string;
  name: string;
  sessionId: string;
  agentId?: string | null;
  uiContext: LLMContext & {
    sessionId: string;
  };
  attachedNotes?: Note[];
  mentionedNotes?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number; created_at?: string }>; // ✅ NOUVEAU
}

/**
 * Service singleton pour construire le contexte LLM
 */
export class ChatContextBuilder {
  private static instance: ChatContextBuilder;

  private constructor() {}

  /**
   * Récupère l'instance singleton
   */
  static getInstance(): ChatContextBuilder {
    if (!ChatContextBuilder.instance) {
      ChatContextBuilder.instance = new ChatContextBuilder();
    }
    return ChatContextBuilder.instance;
  }

  /**
   * Construit le contexte LLM unifié pour l'orchestrateur
   * 
   * Merge:
   * - Session ID
   * - Agent ID (optionnel)
   * - UI context (device info, etc.)
   * - Notes attachées (optionnel)
   * 
   * @param options - Options de construction
   * @returns Contexte LLM complet
   * @throws {ValidationError} Si sessionId manquant ou invalide
   */
  build(options: BuildContextOptions): LLMContextForOrchestrator {
    const { sessionId, agentId, notes, mentions, llmContext } = options;

    // Validation
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      throw new Error('Session ID requis et doit être une string non-vide');
    }

    // Construction du contexte
    const context: LLMContextForOrchestrator = {
      type: 'chat_session',
      id: sessionId,
      name: 'Chat Scrivia',
      sessionId,
      uiContext: {
        ...llmContext,
        sessionId
      }
    };

    // Ajouter agent ID si présent
    if (agentId) {
      context.agentId = agentId;
    }

    // Ajouter notes attachées si présentes
    if (notes && notes.length > 0) {
      context.attachedNotes = notes;
    }

    // ✅ NOUVEAU : Ajouter mentions légères si présentes
    if (mentions && mentions.length > 0) {
      context.mentionedNotes = mentions;
    }

    // Validation finale
    if (!this.validate(context)) {
      throw new Error('Contexte LLM invalide après construction');
    }

    logger.dev('[ChatContextBuilder] ✅ Contexte LLM construit:', {
      sessionId,
      hasAgent: !!agentId,
      notesCount: notes?.length || 0,
      mentionsCount: mentions?.length || 0,
      contextKeys: Object.keys(context)
    });

    return context;
  }

  /**
   * Valide le contexte construit
   * 
   * Vérifie:
   * - Type correct
   * - Session ID présent
   * - UI context présent
   * 
   * @param context - Contexte à valider
   * @returns true si valide, false sinon
   */
  private validate(context: LLMContextForOrchestrator): boolean {
    if (context.type !== 'chat_session') {
      logger.error('[ChatContextBuilder] ❌ Type invalide:', context.type);
      return false;
    }

    if (!context.sessionId || typeof context.sessionId !== 'string') {
      logger.error('[ChatContextBuilder] ❌ Session ID invalide');
      return false;
    }

    if (!context.uiContext || typeof context.uiContext !== 'object') {
      logger.error('[ChatContextBuilder] ❌ UI context manquant');
      return false;
    }

    return true;
  }

  /**
   * Méthode helper pour construire un contexte minimal
   * Utile pour tests
   * 
   * @param sessionId - ID de la session
   * @returns Contexte minimal
   */
  buildMinimal(sessionId: string): LLMContextForOrchestrator {
    return this.build({
      sessionId,
      llmContext: {
        device: 'web',
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Instance singleton exportée
 */
export const chatContextBuilder = ChatContextBuilder.getInstance();

