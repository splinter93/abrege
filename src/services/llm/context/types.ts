/**
 * Types et interfaces pour le système d'injection de contexte modulaire
 * Pattern Strategy similaire à ModelOverrideService
 * 
 * Architecture:
 * - ContextProvider: Interface commune (Strategy pattern)
 * - SystemContextProvider: Injection dans system message
 * - MessageContextProvider: Injection comme message séparé
 * - ContextInjectionService: Orchestrateur qui applique les providers
 */

import type { ChatMessage } from '@/types/chat';
import type { AgentSystemConfig } from '@/services/llm/SystemMessageBuilder';
import type { LLMContext } from '@/types/llmContext';

/**
 * Note attachée (pour AttachedNotesContextProvider)
 */
export interface AttachedNote {
  id: string;
  slug: string;
  title: string;
  markdown_content: string;
  updated_at?: string;
  created_at?: string;
}

/**
 * Note mentionnée (pour MentionedNotesContextProvider)
 */
export interface MentionedNote {
  id: string;
  slug: string;
  title: string;
  description?: string;
  word_count?: number;
  created_at?: string;
}

/**
 * Contexte étendu avec tous les champs possibles
 * Étend LLMContext avec les notes attachées et mentionnées pour les MessageContextProviders
 */
export interface ExtendedLLMContext extends LLMContext {
  // Notes attachées (pour AttachedNotesContextProvider)
  attachedNotes?: AttachedNote[];
  
  // Notes mentionnées (pour MentionedNotesContextProvider)
  mentionedNotes?: MentionedNote[];
}

/**
 * Options pour l'injection de contexte
 * Permet de configurer quels types de contexte injecter
 */
export interface ContextInjectionOptions {
  includeTasks?: boolean;      // Injecter les tâches (futur)
  includeRecent?: boolean;      // Injecter l'historique récent
  maxRecentNotes?: number;       // Nombre max de notes récentes
}

/**
 * Résultat d'un ContextProvider
 * Indique si le contexte doit être injecté et le contenu à injecter
 */
export interface ContextProviderResult {
  shouldInject: boolean;
  content: string;
  metadata?: {
    tokenEstimate?: number;
    [key: string]: unknown;
  };
}

/**
 * Interface commune pour tous les ContextProviders
 * Pattern Strategy: chaque provider implémente cette interface
 */
export interface ContextProvider {
  /**
   * Nom unique du provider (pour logging et debugging)
   */
  readonly name: string;
  
  /**
   * Détermine si ce provider doit injecter du contexte
   * @param context - Contexte LLM étendu
   * @param options - Options d'injection
   * @returns true si le contexte doit être injecté
   */
  shouldInject(context: ExtendedLLMContext, options?: ContextInjectionOptions): boolean;
  
  /**
   * Priorité d'injection (plus élevé = injecté en premier)
   * Utile pour ordonner les providers dans le system message
   * @default 0
   */
  readonly priority?: number;
}

/**
 * Provider pour injection dans le system message
 * Le contenu sera ajouté au system message principal
 */
export interface SystemContextProvider extends ContextProvider {
  /**
   * Injecte le contexte dans le system message
   * @param agentConfig - Configuration de l'agent
   * @param context - Contexte LLM étendu
   * @param options - Options d'injection
   * @returns Contenu markdown à injecter dans le system message
   */
  inject(
    agentConfig: AgentSystemConfig,
    context: ExtendedLLMContext,
    options?: ContextInjectionOptions
  ): string;
}

/**
 * Provider pour injection comme message séparé
 * Le contenu sera ajouté comme un message ChatMessage distinct
 */
export interface MessageContextProvider extends ContextProvider {
  /**
   * Injecte le contexte comme message séparé
   * @param context - Contexte LLM étendu
   * @param options - Options d'injection
   * @returns Message ChatMessage à injecter dans l'historique
   */
  inject(
    context: ExtendedLLMContext,
    options?: ContextInjectionOptions
  ): ChatMessage | null;
}

/**
 * Résultat de l'injection de contexte complète
 * Séparation claire entre system message et messages séparés
 */
export interface ContextInjectionResult {
  /**
   * System message complet (instructions agent + contexte UI)
   */
  systemMessage: string;
  
  /**
   * Messages de contexte séparés (notes, mentions, tâches)
   * Injectés entre l'historique et le message utilisateur
   */
  contextMessages: ChatMessage[];
  
  /**
   * Métadonnées sur l'injection
   */
  metadata: {
    providersApplied: string[];
    systemMessageLength: number;
    contextMessagesCount: number;
    totalTokensEstimate?: number;
  };
}

