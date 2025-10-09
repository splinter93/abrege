/**
 * Service de gestion des templates d'agents
 * Centralise la logique de personnalisation des agents via templates
 */

import { simpleLogger as logger } from '@/utils/logger';
import { contextCollector, UIContext } from './ContextCollector';

export interface AgentTemplateConfig {
  system_instructions?: string;
  context_template?: string;
  personality?: string;
  expertise?: string[];
  capabilities?: string[];
  api_v2_capabilities?: string[];
  // Nouveaux paramètres LLM configurables
  model?: string; // ✅ FIX: Nom complet du modèle (ex: meta-llama/llama-4-maverick-17b-128e-instruct)
  model_variant?: '120b' | '20b';
  temperature?: number;
  max_tokens?: number; // ✅ FIX: Support de max_tokens
  max_completion_tokens?: number;
  top_p?: number;
  stream?: boolean;
  reasoning_effort?: 'low' | 'medium' | 'high';
  stop_sequences?: string[];
  // Support MCP natif
  mcp_config?: {
    enabled: boolean;
    servers: Array<{
      server_label: string;
      server_url: string;
      headers?: Record<string, string>;
    }>;
    hybrid_mode?: boolean; // Si true, combine MCP + OpenAPI tools
  };
  // Compat héritage
  instructions?: string;
  name?: string; // ✅ FIX: Nom de l'agent pour les logs
  id?: string; // ID de l'agent
}

export interface RenderedTemplate {
  content: string;
  hasCustomInstructions: boolean;
  hasContextTemplate: boolean;
  hasPersonality: boolean;
  hasExpertise: boolean;
  hasCapabilities: boolean;
  hasApiV2Capabilities: boolean;
  hasUIContext: boolean;
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
   * Rendu du template principal de l'agent avec contexte UI
   */
  async renderAgentTemplateWithUIContext(
    agentConfig: AgentTemplateConfig,
    uiContext: UIContext,
    fallbackTemplate: string = 'Tu es un assistant IA utile et bienveillant.'
  ): Promise<RenderedTemplate> {
    let content = '';
    let hasCustomInstructions = false;
    let hasContextTemplate = false;
    let hasPersonality = false;
    let hasExpertise = false;
    let hasCapabilities = false;
    let hasApiV2Capabilities = false;
    let hasUIContext = false;

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

    // 2. Template contextuel avec variables (legacy)
    if (agentConfig.context_template) {
      try {
        const contextualContent = this.renderContextTemplate(agentConfig.context_template, {
          type: uiContext.page.type,
          name: uiContext.page.name,
          id: uiContext.activeNote?.id || uiContext.activeClasseur?.id || uiContext.activeFolder?.id || 'current',
          content: uiContext.activeNote?.name || uiContext.page.name
        });
        content = `${content}\n\n${contextualContent}`;
        hasContextTemplate = true;
        logger.dev(`[AgentTemplate] 🌍 Template contextuel appliqué`);
      } catch (error) {
        logger.error(`[AgentTemplate] ❌ Erreur lors de l'application du template contextuel:`, error);
      }
    }

    // 3. Contexte UI (nouveau système)
    const contextResult = contextCollector.generateContextSection(uiContext);
    if (contextResult.contextSection) {
      content = `${content}\n\n${contextResult.contextSection}`;
      hasUIContext = true;
      
      // ✅ SIMPLIFIÉ : Logs réduits
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[AgentTemplate] 🖥️ Contexte UI injecté`);
      }
    }

    // 4. Personnalité
    if (agentConfig.personality) {
      content += `\n\n## Personnalité\n${agentConfig.personality}`;
      hasPersonality = true;
      logger.dev(`[AgentTemplate] 🎭 Personnalité ajoutée`);
    }

    // 5. Domaines d'expertise
    if (agentConfig.expertise && agentConfig.expertise.length > 0) {
      const expertiseList = agentConfig.expertise.filter(e => e?.trim()).join(', ');
      if (expertiseList) {
        content += `\n\n## Domaines d'expertise\n${expertiseList}`;
        hasExpertise = true;
        logger.dev(`[AgentTemplate] 🎓 Expertise ajoutée`);
      }
    }

    // 6. Capacités
    if (agentConfig.capabilities && agentConfig.capabilities.length > 0) {
      const capabilitiesList = agentConfig.capabilities.filter(c => c?.trim()).join(', ');
      if (capabilitiesList) {
        content += `\n\n## Capacités\n${capabilitiesList}`;
        hasCapabilities = true;
        logger.dev(`[AgentTemplate] 🔧 Capacités ajoutées`);
      }
    }

    // 7. Capacités API v2
    if (agentConfig.api_v2_capabilities && agentConfig.api_v2_capabilities.length > 0) {
      const apiCapabilitiesList = agentConfig.api_v2_capabilities.filter(c => c?.trim()).join(', ');
      if (apiCapabilitiesList) {
        content += `\n\n## Capacités API v2\n${apiCapabilitiesList}`;
        hasApiV2Capabilities = true;
        logger.dev(`[AgentTemplate] 🚀 Capacités API v2 ajoutées`);
      }
    }

    logger.dev(`[AgentTemplate] ✅ Template complet rendu (${content.length} chars)`, {
      hasCustomInstructions,
      hasContextTemplate,
      hasUIContext,
      hasPersonality,
      hasExpertise,
      hasCapabilities,
      hasApiV2Capabilities
    });

    return {
      content: content.trim(),
      hasCustomInstructions,
      hasContextTemplate,
      hasPersonality,
      hasExpertise,
      hasCapabilities,
      hasApiV2Capabilities,
      hasUIContext
    };
  }

  /**
   * Rendu du template principal de l'agent (legacy)
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
    let hasUIContext = false;

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
      
      // 🔧 PLUS BESOIN D'INSTRUCTIONS D'AUTH - Le système gère ça automatiquement
      // Les agents utilisent maintenant les services internes directement
      // Plus d'appels HTTP, plus d'erreurs 401, plus de bypass tokens
    }

    return {
      content,
      hasCustomInstructions,
      hasContextTemplate,
      hasPersonality,
      hasExpertise,
      hasCapabilities,
      hasApiV2Capabilities,
      hasUIContext: false
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