/**
 * UIContextProvider - Injection du contexte UI dans le system message
 * Responsabilités:
 * - Date/heure locale
 * - Device type (mobile/tablet/desktop)
 * - Page actuelle
 * - Contexte actif (note, folder, classeur)
 * - Session ID
 * 
 * Pattern: SystemContextProvider
 * Conformité: < 150 lignes, ZERO any, logging structuré
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { SystemContextProvider } from '../types';
import type { AgentSystemConfig } from '@/services/llm/SystemMessageBuilder';
import type { ExtendedLLMContext, ContextInjectionOptions } from '../types';

export class UIContextProvider implements SystemContextProvider {
  readonly name = 'UIContext';
  readonly priority = 10; // Priorité haute (injecté en premier dans le system message)

  shouldInject(context: ExtendedLLMContext, _options?: ContextInjectionOptions): boolean {
    // Injecter si on a au moins le sessionId ou les infos de base
    return !!(context.sessionId || (context.time?.local && context.device?.type && context.user?.locale));
  }

  inject(
    _agentConfig: AgentSystemConfig,
    context: ExtendedLLMContext,
    _options?: ContextInjectionOptions
  ): string {
    const contextParts: string[] = [];

    // Format ultra-compact avec emojis
    if (context.time?.local && context.device?.type && context.user?.locale) {
      const deviceEmoji = context.device.type === 'mobile' ? '📱' : context.device.type === 'tablet' ? '📲' : '💻';
      const localeFlag = context.user.locale === 'fr' ? '🇫🇷' : '🇬🇧';
      const timezone = context.time.timezone ?? context.time.timestamp ?? 'UTC';
      contextParts.push(`📅 ${context.time.local} (${timezone}) | ${deviceEmoji} ${context.device.type} | ${localeFlag} ${context.user.locale.toUpperCase()}`);

      // Page actuelle
      if (context.page) {
        const pageEmojiMap: Record<string, string> = {
          chat: '💬',
          editor: '✍️',
          folder: '📁',
          classeur: '📚',
          home: '🏠'
        };
        const pageEmoji = pageEmojiMap[context.page.type] || '❓';
        contextParts.push(`${pageEmoji} ${context.page.type}${context.page.action ? ` (${context.page.action})` : ''}`);
      }

      // Contexte actif
      if (context.active?.note) {
        contextParts.push(`📝 Note: ${context.active.note.title}`);
      }
      if (context.active?.folder) {
        contextParts.push(`📁 Dossier: ${context.active.folder.name}`);
      }
      if (context.active?.classeur) {
        contextParts.push(`📚 Classeur: ${context.active.classeur.name}`);
      }
    }

    // ✅ CRITIQUE : Injecter sessionId systématiquement
    if (context.sessionId && context.sessionId !== 'current') {
      contextParts.push(`🔑 Session ID: ${context.sessionId}`);
    }

    if (contextParts.length === 0) {
      return '';
    }

    let content = `## Contexte Actuel\n${contextParts.join('\n')}`;

    // Avertissement date/heure uniquement si on a injecté le contexte temporel
    if (context.time?.local && context.device?.type && context.user?.locale) {
      content += `\n\n⚠️ Date/heure ci-dessus = MAINTENANT (actualisée automatiquement). Ne cherche pas l'heure ailleurs.`;
    }

    logger.dev('[UIContextProvider] ✅ Contexte UI injecté', {
      hasSessionId: !!(context.sessionId && context.sessionId !== 'current'),
      partsCount: contextParts.length
    });

    return content;
  }
}

