/**
 * SystemMessageBuilder - Construction intelligente des messages système
 * Gère l'injection des instructions système et templates contextuels des agents
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { LLMContext } from '@/types/llmContext';

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
  provider?: string; // ✅ NOUVEAU : Pour détecter le provider (xai, groq, etc.)
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

      if (primaryInstructions) {
        content = primaryInstructions;
        hasCustomInstructions = true;
        logger.dev(`[SystemMessageBuilder] 🎯 Instructions système personnalisées utilisées`);
      } else {
        content = fallbackTemplate;
        logger.dev(`[SystemMessageBuilder] ⚙️ Template par défaut utilisé`);
      }

      // ✅ Injection contexte UI compact (date, device, page)
      if (context && typeof context === 'object') {
        const ctx = context as Partial<LLMContext> & {
          attachedNotes?: Array<{
            title: string;
            slug: string;
            markdown_content: string;
          }>;
        }; // ✅ Type strict (pas any)
        const contextParts: string[] = [];
        
        // Format ultra-compact avec emojis (comme AgentOrchestrator)
        if (ctx.time?.local && ctx.device?.type && ctx.user?.locale) {
          const deviceEmoji = ctx.device.type === 'mobile' ? '📱' : ctx.device.type === 'tablet' ? '📲' : '💻';
          const localeFlag = ctx.user.locale === 'fr' ? '🇫🇷' : '🇬🇧';
          const timezone = ctx.time.timezone ?? ctx.time.timestamp ?? 'UTC';
          contextParts.push(`📅 ${ctx.time.local} (${timezone}) | ${deviceEmoji} ${ctx.device.type} | ${localeFlag} ${ctx.user.locale.toUpperCase()}`);
          
          // Page actuelle
          if (ctx.page) {
            const pageEmojiMap: Record<string, string> = {
              chat: '💬',
              editor: '✍️',
              folder: '📁',
              classeur: '📚',
              home: '🏠'
            };
            const pageEmoji = pageEmojiMap[ctx.page.type] || '❓';
            contextParts.push(`${pageEmoji} ${ctx.page.type}${ctx.page.action ? ` (${ctx.page.action})` : ''}`);
          }
          
          // Contexte actif
          if (ctx.active?.note) {
            contextParts.push(`📝 Note: ${ctx.active.note.title}`);
          }
          if (ctx.active?.folder) {
            contextParts.push(`📁 Dossier: ${ctx.active.folder.name}`);
          }
          if (ctx.active?.classeur) {
            contextParts.push(`📚 Classeur: ${ctx.active.classeur.name}`);
          }
        }

        if (contextParts.length > 0) {
          content += `\n\n## Contexte Actuel\n${contextParts.join('\n')}`;
          content += `\n\n⚠️ Date/heure ci-dessus = MAINTENANT (actualisée automatiquement). Ne cherche pas l'heure ailleurs.`;
          logger.dev(`[SystemMessageBuilder] 🌍 Contexte UI injecté (compact)`);
        }

        // ✅ ENRICHISSEMENT : User stats, session, notifications
        const enrichedParts: string[] = [];

        // User stats (si disponible)
        if (ctx.user) {
          const userParts: string[] = [];
          
          if ((ctx.user as any).last_login) {
            const lastLoginAgo = this.getTimeAgo((ctx.user as any).last_login);
            userParts.push(`🕒 Dernière connexion: ${lastLoginAgo}`);
          }
          
          if ((ctx.user as any).stats) {
            const stats = (ctx.user as any).stats;
            if (stats.notes_count !== undefined || stats.sessions_count !== undefined) {
              const notesStr = stats.notes_count !== undefined ? `${stats.notes_count} notes` : '';
              const sessionsStr = stats.sessions_count !== undefined ? `${stats.sessions_count} sessions` : '';
              const statsStr = [notesStr, sessionsStr].filter(Boolean).join(' | ');
              if (statsStr) userParts.push(`📊 ${statsStr}`);
            }
          }
          
          if ((ctx.user as any).notifications_count && (ctx.user as any).notifications_count > 0) {
            userParts.push(`🔔 ${(ctx.user as any).notifications_count} notifications non lues`);
          }

          if (userParts.length > 0) {
            enrichedParts.push(`## Utilisateur\n${userParts.join('\n')}`);
          }
        }

        // Session info (si disponible)
        if ((ctx as any).session) {
          const session = (ctx as any).session;
          const sessionParts: string[] = [];
          
          if (session.message_count !== undefined && session.message_count > 0) {
            sessionParts.push(`💬 ${session.message_count} messages dans cette session`);
          }
          
          if (session.tools_used && Array.isArray(session.tools_used) && session.tools_used.length > 0) {
            const recentTools = session.tools_used.slice(-3).join(', ');
            sessionParts.push(`🔧 Tools utilisés: ${recentTools}`);
          }
          
          if (session.attached_notes_count && session.attached_notes_count > 0) {
            sessionParts.push(`📎 ${session.attached_notes_count} note(s) attachée(s)`);
          }

          if (sessionParts.length > 0) {
            enrichedParts.push(`## Session\n${sessionParts.join('\n')}`);
          }
        }

        if (enrichedParts.length > 0) {
          content += `\n\n${enrichedParts.join('\n\n')}`;
          logger.dev(`[SystemMessageBuilder] ✨ Contexte enrichi (user stats + session)`);
        }
        
        // ✅ REFACTO: Notes attachées gérées séparément (évite duplication tokens)
        // Les notes sont injectées comme message séparé dans la route API
        // Voir: AttachedNotesFormatter.buildContextMessage() et /api/chat/llm/stream/route.ts
        // Raison: Séparation données (notes) vs instructions (system), citations précises avec numéros de lignes
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

      // 3. Personnalité (optionnel - feature smart pour dupliquer agents)
      if (agentConfig.personality?.trim()) {
        content += `\n\n## Personnalité\n${agentConfig.personality.trim()}`;
        hasPersonality = true;
        logger.dev(`[SystemMessageBuilder] 🎭 Personnalité ajoutée`);
      }

      // ✅ SIMPLIFIÉ : Expertise et capabilities supprimés (redondant avec system_instructions)

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
   * Convertit un timestamp en format "il y a X temps" lisible
   */
  private getTimeAgo(timestamp: string): string {
    try {
      const now = new Date();
      const then = new Date(timestamp);
      const diff = now.getTime() - then.getTime();
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return 'à l\'instant';
      if (minutes < 60) return `il y a ${minutes} min`;
      if (hours < 24) return `il y a ${hours}h`;
      if (days === 1) return 'hier';
      if (days < 7) return `il y a ${days} jours`;
      if (days < 30) return `il y a ${Math.floor(days / 7)} semaine${Math.floor(days / 7) > 1 ? 's' : ''}`;
      if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
      return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`;
    } catch (error) {
      logger.error('[SystemMessageBuilder] ❌ Erreur getTimeAgo:', error);
      return 'récemment';
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
