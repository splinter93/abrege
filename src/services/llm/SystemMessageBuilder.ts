/**
 * SystemMessageBuilder - Construction intelligente des messages système
 * Gère l'injection des instructions système et templates contextuels des agents
 * 
 * Refactorisé pour utiliser ContextInjectionService (délégation contexte UI)
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { LLMContext } from '@/types/llmContext';
import { contextInjectionService } from './context';
import type { ExtendedLLMContext } from './context/types';

export interface AgentSystemConfig {
  system_instructions?: string;
  context_template?: string;
  personality?: string;
  expertise?: string[];
  capabilities?: string[];
}

export interface SystemMessageContext {
  type: string;
  name: string;
  id: string;
  content?: string;
  provider?: string;
  [key: string]: unknown;
}

export interface SystemMessageResult {
  content: string;
  hasCustomInstructions: boolean;
  hasContextTemplate: boolean;
  hasPersonality: boolean;
  hasExpertise: boolean;
  hasCapabilities: boolean;
}

/**
 * Builder pour les messages système des agents
 * Centralise la logique d'injection des instructions système
 * 
 * Contexte UI délégué à ContextInjectionService
 */
export class SystemMessageBuilder {
  private static instance: SystemMessageBuilder;

  static getInstance(): SystemMessageBuilder {
    if (!SystemMessageBuilder.instance) {
      SystemMessageBuilder.instance = new SystemMessageBuilder();
    }
    return SystemMessageBuilder.instance;
  }

  /**
   * Construit le message système complet pour un agent
   * 
   * Processus:
   * 1. Instructions système personnalisées (ou fallback)
   * 2. Injection contexte UI via ContextInjectionService
   * 3. Template contextuel avec variables
   * 4. Personnalité (optionnel)
   */
  buildSystemMessage(
    agentConfig: AgentSystemConfig,
    context: SystemMessageContext = { type: 'chat', name: 'Session', id: 'default' },
    fallbackTemplate: string = 'Tu es un assistant IA utile et bienveillant.'
  ): SystemMessageResult {
    let content = '';
    let hasCustomInstructions = false;
    let hasContextTemplate = false;
    let hasPersonality = false;
    let hasExpertise = false;
    let hasCapabilities = false;

    try {
      // 1. Instructions système personnalisées (priorité haute)
      const primaryInstructions = agentConfig.system_instructions?.trim();

      if (primaryInstructions) {
        content = primaryInstructions;
        hasCustomInstructions = true;
        logger.dev(`[SystemMessageBuilder] 🎯 Instructions système personnalisées utilisées`);
      } else {
        content = fallbackTemplate;
        logger.dev(`[SystemMessageBuilder] ⚙️ Template par défaut utilisé`);
      }

      // 2. Injection contexte UI via ContextInjectionService
      if (context && typeof context === 'object') {
        const ctx = context as Partial<LLMContext> & SystemMessageContext;
        
        // Construire ExtendedLLMContext à partir du contexte reçu
        const extendedContext: ExtendedLLMContext = {
          sessionId: ctx.sessionId || context.id || 'current',
          agentId: ctx.agentId,
          time: ctx.time || {
            local: new Date().toLocaleString('fr-FR'),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString()
          },
          user: ctx.user || {
            name: 'Utilisateur',
            locale: 'fr'
          },
          page: ctx.page || {
            type: 'chat',
            path: '/chat'
          },
          device: ctx.device || {
            type: 'desktop'
          },
          active: ctx.active,
          recent: ctx.recent,
          canva_context: ctx.canva_context,
          session: ctx.session,
          // Notes attachées et mentionnées (si présentes dans le contexte)
          attachedNotes: (ctx as { attachedNotes?: unknown[] }).attachedNotes as ExtendedLLMContext['attachedNotes'],
          mentionedNotes: (ctx as { mentionedNotes?: unknown[] }).mentionedNotes as ExtendedLLMContext['mentionedNotes'],
          canvasSelections: (ctx as { canvasSelections?: unknown[] }).canvasSelections as ExtendedLLMContext['canvasSelections']
        };

        // Utiliser ContextInjectionService pour injecter le contexte UI
        const contextResult = contextInjectionService.injectContext(
          agentConfig,
          extendedContext
        );

        // Ajouter le contexte UI au system message
        if (contextResult.systemMessage) {
          content += `\n\n${contextResult.systemMessage}`;
          logger.dev(`[SystemMessageBuilder] 🌍 Contexte UI injecté via ContextInjectionService`, {
            providersApplied: contextResult.metadata.providersApplied,
            systemMessageLength: contextResult.metadata.systemMessageLength
          });
        }
      }

      // 3. Template contextuel avec variables
      if (agentConfig.context_template) {
        try {
          const contextualContent = this.renderContextTemplate(agentConfig.context_template, context);
          if (contextualContent.trim()) {
            content = `${content}\n\n${contextualContent}`;
            hasContextTemplate = true;
            logger.dev(`[SystemMessageBuilder] 🌍 Template contextuel appliqué`);
          }
        } catch (error) {
          logger.error(`[SystemMessageBuilder] ❌ Erreur template contextuel:`, error);
        }
      }

      // 4. Personnalité (optionnel)
      if (agentConfig.personality?.trim()) {
        content += `\n\n## Personnalité\n${agentConfig.personality.trim()}`;
        hasPersonality = true;
        logger.dev(`[SystemMessageBuilder] 🎭 Personnalité ajoutée`);
      }

      logger.dev(`[SystemMessageBuilder] ✅ Message système construit (${content.length} chars)`, {
        hasCustomInstructions,
        hasContextTemplate,
        hasPersonality
      });

      return {
        content: content.trim(),
        hasCustomInstructions,
        hasContextTemplate,
        hasPersonality,
        hasExpertise: false, // Supprimé (redondant)
        hasCapabilities: false // Supprimé (redondant)
      };

    } catch (error) {
      logger.error(`[SystemMessageBuilder] ❌ Erreur construction message système:`, error);

      // Fallback en cas d'erreur
      return {
        content: fallbackTemplate,
        hasCustomInstructions: false,
        hasContextTemplate: false,
        hasPersonality: false,
        hasExpertise: false,
        hasCapabilities: false
      };
    }
  }

  /**
   * Rend un template contextuel avec substitution de variables
   */
  private renderContextTemplate(template: string, context: SystemMessageContext): string {
    if (!template || !context) {
      return '';
    }

    try {
      let rendered = template;

      // Remplacer les variables du contexte
      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const placeholder = new RegExp(`{{${key}}}`, 'g');
          rendered = rendered.replace(placeholder, String(value));
        }
      });

      // Nettoyer les placeholders non remplacés
      rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

      return rendered.trim();

    } catch (error) {
      logger.error(`[SystemMessageBuilder] ❌ Erreur rendu template contextuel:`, error);
      return '';
    }
  }

  /**
   * Valide la configuration d'un agent
   */
  validateAgentConfig(agentConfig: AgentSystemConfig): boolean {
    if (!agentConfig) {
      return false;
    }

    const hasInstructions = !!(
      agentConfig.system_instructions?.trim() ||
      agentConfig.context_template?.trim()
    );

    return hasInstructions;
  }

  /**
   * Obtient un résumé de la configuration d'un agent
   */
  getAgentConfigSummary(agentConfig: AgentSystemConfig): string {
    const parts: string[] = [];

    if (agentConfig.system_instructions?.trim()) {
      parts.push(`Instructions: ${agentConfig.system_instructions.trim().substring(0, 50)}...`);
    }
    if (agentConfig.context_template?.trim()) {
      parts.push(`Template: ${agentConfig.context_template.trim().substring(0, 30)}...`);
    }
    if (agentConfig.personality?.trim()) {
      parts.push(`Personnalité: ${agentConfig.personality.trim().substring(0, 30)}...`);
    }
    if (agentConfig.expertise?.length) {
      parts.push(`Expertise: ${agentConfig.expertise.length} domaines`);
    }
    if (agentConfig.capabilities?.length) {
      parts.push(`Capacités: ${agentConfig.capabilities.length} items`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Configuration par défaut';
  }
}

// Instance singleton
export const systemMessageBuilder = SystemMessageBuilder.getInstance();
