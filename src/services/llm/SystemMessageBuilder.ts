/**
 * SystemMessageBuilder - Construction intelligente des messages système
 * Gère l'injection des instructions système et templates contextuels des agents
 */

import { simpleLogger as logger } from '@/utils/logger';

export interface AgentSystemConfig {
  system_instructions?: string;
  context_template?: string;
  personality?: string;
  expertise?: string[];
  capabilities?: string[];
  // Compatibilité héritage
  instructions?: string;
}

export interface SystemMessageContext {
  type: string;
  name: string;
  id: string;
  content?: string;
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
      const legacyInstructions = agentConfig.instructions?.trim();
      
      if (primaryInstructions || legacyInstructions) {
        content = (primaryInstructions || legacyInstructions)!;
        hasCustomInstructions = true;
        logger.dev(`[SystemMessageBuilder] 🎯 Instructions système personnalisées utilisées`);
      } else {
        content = fallbackTemplate;
        logger.dev(`[SystemMessageBuilder] ⚙️ Template par défaut utilisé`);
      }

      // 2. Template contextuel avec variables
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

      // 3. Personnalité (optionnel)
      if (agentConfig.personality?.trim()) {
        content += `\n\n## Personnalité\n${agentConfig.personality.trim()}`;
        hasPersonality = true;
        logger.dev(`[SystemMessageBuilder] 🎭 Personnalité ajoutée`);
      }

      // 4. Domaines d'expertise (optionnel)
      if (agentConfig.expertise && agentConfig.expertise.length > 0) {
        const expertiseList = agentConfig.expertise.filter(e => e?.trim()).join(', ');
        if (expertiseList) {
          content += `\n\n## Domaines d'expertise\n${expertiseList}`;
          hasExpertise = true;
          logger.dev(`[SystemMessageBuilder] 🎓 Expertise ajoutée`);
        }
      }

      // 5. Capacités (optionnel)
      if (agentConfig.capabilities && agentConfig.capabilities.length > 0) {
        const capabilitiesList = agentConfig.capabilities.filter(c => c?.trim()).join(', ');
        if (capabilitiesList) {
          content += `\n\n## Capacités\n${capabilitiesList}`;
          hasCapabilities = true;
          logger.dev(`[SystemMessageBuilder] 🔧 Capacités ajoutées`);
        }
      }

      logger.dev(`[SystemMessageBuilder] ✅ Message système construit (${content.length} chars)`, {
        hasCustomInstructions,
        hasContextTemplate,
        hasPersonality,
        hasExpertise,
        hasCapabilities
      });

      return {
        content: content.trim(),
        hasCustomInstructions,
        hasContextTemplate,
        hasPersonality,
        hasExpertise,
        hasCapabilities
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
      // Substitution simple des variables {{variable}}
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

    // Au moins une source d'instructions doit être présente
    const hasInstructions = !!(
      agentConfig.system_instructions?.trim() ||
      agentConfig.instructions?.trim() ||
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
