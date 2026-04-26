/**
 * Service de gestion des templates d'agents
 * Centralise la logique de personnalisation des agents via templates
 */

import { simpleLogger as logger } from '@/utils/logger';
import { contextCollector, UIContext } from './ContextCollector';

export interface AgentTemplateConfig {
  // Instructions et comportement
  system_instructions?: string;
  context_template?: string;
  
  // Capacités (tool routing — ne pas injecter en texte dans le system message)
  capabilities?: string[];
  api_v2_capabilities?: string[];
  
  // Paramètres LLM
  model?: string;
  model_variant?: string;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop_sequences?: string[];
  /** Groq/Cerebras : low | medium | high. DeepSeek V4 (Liminality) : disabled | none | high | max (+ low/medium mappés en high côté payload). */
  reasoning_effort?: 'low' | 'medium' | 'high' | 'max' | 'disabled' | 'none' | null;
  provider?: string;
  
  // Support MCP natif
  mcp_config?: {
    enabled: boolean;
    servers: Array<{
      server_label: string;
      server_url: string;
      headers?: Record<string, string>;
    }>;
    hybrid_mode?: boolean;
  };
  
  // Métadonnées (pour les logs)
  name?: string;
  id?: string;
  slug?: string;
}

export interface RenderedTemplate {
  content: string;
  hasCustomInstructions: boolean;
  hasContextTemplate: boolean;
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
    let hasApiV2Capabilities = false;
    let hasUIContext = false;

    // 1. Instructions système personnalisées
    const primaryInstructions = agentConfig.system_instructions?.trim();
    if (primaryInstructions) {
      content = primaryInstructions;
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
      logger.dev(`[AgentTemplate] 🖥️ Contexte UI injecté`);
    }

    // 4. Capacités API v2 (tracking uniquement — pas d'injection en texte)
    if (agentConfig.api_v2_capabilities && agentConfig.api_v2_capabilities.length > 0) {
      hasApiV2Capabilities = true;
    }

    logger.dev(`[AgentTemplate] ✅ Template complet rendu (${content.length} chars)`, {
      hasCustomInstructions,
      hasContextTemplate,
      hasUIContext,
      hasApiV2Capabilities
    });

    return {
      content: content.trim(),
      hasCustomInstructions,
      hasContextTemplate,
      hasApiV2Capabilities,
      hasUIContext
    };
  }

  /**
   * Rendu du template principal de l'agent (legacy)
   */
  renderAgentTemplate(
    agentConfig: AgentTemplateConfig,
    context: Record<string, unknown> = {},
    fallbackTemplate: string = 'Tu es un assistant IA utile et bienveillant.'
  ): RenderedTemplate {
    let content = '';
    let hasCustomInstructions = false;
    let hasContextTemplate = false;
    let hasApiV2Capabilities = false;

    // 1. Instructions système personnalisées
    const primaryInstructions = agentConfig.system_instructions?.trim();
    if (primaryInstructions) {
      content = primaryInstructions;
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

    // 3. Capacités API v2 (tracking uniquement — pas d'injection en texte)
    if (agentConfig.api_v2_capabilities && Array.isArray(agentConfig.api_v2_capabilities) && agentConfig.api_v2_capabilities.length > 0) {
      hasApiV2Capabilities = true;
      logger.dev(`[AgentTemplate] 🔧 Capacités API v2 détectées: ${agentConfig.api_v2_capabilities.length} outils`);
    }

    return {
      content,
      hasCustomInstructions,
      hasContextTemplate,
      hasApiV2Capabilities,
      hasUIContext: false
    };
  }

  /**
   * Rendu du template contextuel avec remplacement de variables
   */
  private renderContextTemplate(template: string, context: Record<string, unknown>): string {
    const getString = (value: unknown, defaultValue: string): string => {
      return typeof value === 'string' ? value : defaultValue;
    };
    
    return template
      .replace(/\{\{type\}\}/g, getString(context.type, 'chat_session'))
      .replace(/\{\{name\}\}/g, getString(context.name, 'Session de chat'))
      .replace(/\{\{id\}\}/g, getString(context.id, 'current'))
      .replace(/\{\{content\}\}/g, getString(context.content, 'Assistant de chat pour la gestion de notes et dossiers'));
  }

  /**
   * Vérification de la validité des capacités API v2
   */
  hasValidApiV2Capabilities(agentConfig: AgentTemplateConfig): boolean {
    return Array.isArray(agentConfig.api_v2_capabilities) && agentConfig.api_v2_capabilities.length > 0;
  }

  /**
   * Retourne une configuration d'agent par défaut
   */
  getDefaultAgent(): AgentTemplateConfig {
    return {
      id: 'default',
      name: 'Agent par défaut',
      system_instructions: 'Tu es un assistant IA intelligent et utile.',
      model_variant: 'llama-4-maverick-17b-128e-instruct',
      temperature: 0.7,
      max_completion_tokens: 4000,
      capabilities: ['text', 'function_calling'],
      api_v2_capabilities: []
    };
  }

  /**
   * Résumé des templates utilisés (pour logs)
   */
  generateTemplateSummary(agentConfig: AgentTemplateConfig): string {
    const summary: string[] = [];

    const primaryInstructions = agentConfig.system_instructions;
    if (primaryInstructions) {
      const length = primaryInstructions.length;
      summary.push(`✅ Instructions système: ${length} caractères`);
    }

    if (agentConfig.context_template) {
      summary.push(`✅ Template contextuel: ${agentConfig.context_template.length} caractères`);
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