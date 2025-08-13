/**
 * Service de gestion des templates d'agents
 * Centralise la logique de personnalisation des agents via templates
 */

import { simpleLogger as logger } from '@/utils/logger';

export interface AgentTemplateConfig {
  system_instructions?: string;
  context_template?: string;
  personality?: string;
  expertise?: string[];
  capabilities?: string[];
  api_v2_capabilities?: string[];
  // Nouveaux paramètres LLM configurables
  model_variant?: '120b' | '20b';
  temperature?: number;
  max_completion_tokens?: number;
  top_p?: number;
  stream?: boolean;
  reasoning_effort?: 'low' | 'medium' | 'high';
  stop_sequences?: string[];
  // Compat héritage
  instructions?: string;
}

export interface RenderedTemplate {
  content: string;
  hasCustomInstructions: boolean;
  hasContextTemplate: boolean;
  hasPersonality: boolean;
  hasExpertise: boolean;
  hasCapabilities: boolean;
  hasApiV2Capabilities: boolean;
}

/**
 * Service de gestion des templates d'agents
 */
export class AgentTemplateService {
  private static instance: AgentTemplateService;

  private constructor() {}

  static getInstance(): AgentTemplateService {
    if (!AgentTemplateService.instance) {
      AgentTemplateService.instance = new AgentTemplateService();
    }
    return AgentTemplateService.instance;
  }

  /**
   * Rendu du template principal de l'agent
   */
  renderAgentTemplate(
    agentConfig: AgentTemplateConfig,
    context: Record<string, any> = {},
    fallbackTemplate: string = 'Tu es un assistant IA utile et bienveillant.'
  ): RenderedTemplate {
    let content = '';
    let hasCustomInstructions = false;
    let hasContextTemplate = false;
    let hasPersonality = false;
    let hasExpertise = false;
    let hasCapabilities = false;
    let hasApiV2Capabilities = false;

    // 1. Instructions système personnalisées
    const primaryInstructions = agentConfig.system_instructions?.trim();
    const legacyInstructions = agentConfig.instructions?.trim();
    if (primaryInstructions || legacyInstructions) {
      content = (primaryInstructions || legacyInstructions)!;
      hasCustomInstructions = true;
      logger.dev(`[AgentTemplate] 🎯 Template personnalisé utilisé pour l'agent`);
    } else {
      content = fallbackTemplate;
      logger.dev(`[AgentTemplate] ⚙️ Template par défaut utilisé`);
    }

    // 2. Template contextuel avec variables
    if (agentConfig.context_template) {
      try {
        const contextualContent = this.renderContextTemplate(agentConfig.context_template, context);
        content = `${content}\n\n${contextualContent}`;
        hasContextTemplate = true;
        logger.dev(`[AgentTemplate] 🌍 Template contextuel appliqué`);
      } catch (error) {
        logger.error(`[AgentTemplate] ❌ Erreur lors de l'application du template contextuel:`, error);
      }
    }

    // 3. Personnalité
    if (agentConfig.personality) {
      content += `\n\n## Personnalité\n${agentConfig.personality}`;
      hasPersonality = true;
      logger.dev(`[AgentTemplate] 🎭 Personnalité ajoutée`);
    }

    // 4. Domaines d'expertise
    if (agentConfig.expertise && Array.isArray(agentConfig.expertise) && agentConfig.expertise.length > 0) {
      content += `\n\n## Domaines d'expertise\n${agentConfig.expertise.join(', ')}`;
      hasExpertise = true;
      logger.dev(`[AgentTemplate] 🧠 Expertise ajoutée: ${agentConfig.expertise.join(', ')}`);
    }

    // 5. Capacités spéciales
    if (agentConfig.capabilities && Array.isArray(agentConfig.capabilities) && agentConfig.capabilities.length > 0) {
      content += `\n\n## Capacités spéciales\n${agentConfig.capabilities.join(', ')}`;
      hasCapabilities = true;
      logger.dev(`[AgentTemplate] 🚀 Capacités ajoutées: ${agentConfig.capabilities.join(', ')}`);
    }

    // 6. Capacités API v2
    if (agentConfig.api_v2_capabilities && Array.isArray(agentConfig.api_v2_capabilities) && agentConfig.api_v2_capabilities.length > 0) {
      hasApiV2Capabilities = true;
      logger.dev(`[AgentTemplate] 🔧 Capacités API v2 détectées: ${agentConfig.api_v2_capabilities.length} outils`);
    }

    return {
      content,
      hasCustomInstructions,
      hasContextTemplate,
      hasPersonality,
      hasExpertise,
      hasCapabilities,
      hasApiV2Capabilities
    };
  }

  /**
   * Rendu du template contextuel avec remplacement de variables
   */
  private renderContextTemplate(template: string, context: Record<string, any>): string {
    return template
      .replace(/\{\{type\}\}/g, context.type || 'chat_session')
      .replace(/\{\{name\}\}/g, context.name || 'Session de chat')
      .replace(/\{\{id\}\}/g, context.id || 'current')
      .replace(/\{\{content\}\}/g, context.content || 'Assistant de chat pour la gestion de notes et dossiers');
  }

  /**
   * Vérification de la validité des capacités API v2
   */
  hasValidApiV2Capabilities(agentConfig: AgentTemplateConfig): boolean {
    return Array.isArray(agentConfig.api_v2_capabilities) && agentConfig.api_v2_capabilities.length > 0;
  }

  /**
   * Résumé des templates utilisés (pour logs)
   */
  generateTemplateSummary(agentConfig: AgentTemplateConfig): string {
    const summary: string[] = [];

    const primaryInstructions = agentConfig.system_instructions;
    const legacyInstructions = agentConfig.instructions;
    if (primaryInstructions || legacyInstructions) {
      const length = (primaryInstructions || legacyInstructions)?.length || 0;
      summary.push(`✅ Instructions système: ${length} caractères`);
    }

    if (agentConfig.context_template) {
      summary.push(`✅ Template contextuel: ${agentConfig.context_template.length} caractères`);
    }

    if (agentConfig.personality) {
      summary.push(`✅ Personnalité: ${agentConfig.personality.length} caractères`);
    }

    if (agentConfig.expertise?.length) {
      summary.push(`✅ Expertise: ${agentConfig.expertise.length} domaines`);
    }

    if (agentConfig.capabilities?.length) {
      summary.push(`✅ Capacités: ${agentConfig.capabilities.length} spécialités`);
    }

    if (agentConfig.api_v2_capabilities?.length) {
      summary.push(`✅ API v2: ${agentConfig.api_v2_capabilities.length} outils`);
    }

    // Nouveaux paramètres LLM
    if (agentConfig.model_variant) {
      summary.push(`🤖 Modèle: ${agentConfig.model_variant}`);
    }

    if (agentConfig.temperature !== undefined) {
      summary.push(`🌡️ Temperature: ${agentConfig.temperature}`);
    }

    if (agentConfig.max_completion_tokens) {
      summary.push(`📏 Max tokens: ${agentConfig.max_completion_tokens}`);
    }

    if (agentConfig.top_p !== undefined) {
      summary.push(`🎲 Top P: ${agentConfig.top_p}`);
    }

    if (agentConfig.stream !== undefined) {
      summary.push(`🔄 Streaming: ${agentConfig.stream ? 'Activé' : 'Désactivé'}`);
    }

    if (agentConfig.reasoning_effort) {
      summary.push(`🧠 Raisonnement: ${agentConfig.reasoning_effort}`);
    }

    if (agentConfig.stop_sequences?.length) {
      summary.push(`🛑 Stop sequences: ${agentConfig.stop_sequences.length} configurées`);
    }

    return summary.length > 0 ? summary.join('\n') : '❌ Aucun template personnalisé';
  }
}

// Export de l'instance singleton
export const agentTemplateService = AgentTemplateService.getInstance(); 