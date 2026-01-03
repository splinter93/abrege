/**
 * SessionContextProvider - Injection des stats de session dans le system message
 * Responsabilités:
 * - Nombre de messages dans la session
 * - Tools utilisés récemment
 * - Nombre de notes attachées
 * 
 * Pattern: SystemContextProvider
 * Conformité: < 150 lignes, ZERO any, logging structuré
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { SystemContextProvider } from '../types';
import type { AgentSystemConfig } from '@/services/llm/SystemMessageBuilder';
import type { ExtendedLLMContext, ContextInjectionOptions } from '../types';

export class SessionContextProvider implements SystemContextProvider {
  readonly name = 'Session';
  readonly priority = 30; // Après UserStats

  shouldInject(context: ExtendedLLMContext, _options?: ContextInjectionOptions): boolean {
    return !!(
      context.session?.message_count ||
      context.session?.tools_used ||
      (context.session?.attached_notes_count !== undefined && context.session.attached_notes_count > 0)
    );
  }

  inject(
    _agentConfig: AgentSystemConfig,
    context: ExtendedLLMContext,
    _options?: ContextInjectionOptions
  ): string {
    if (!context.session) {
      return '';
    }

    const sessionParts: string[] = [];

    // Nombre de messages
    if (context.session.message_count !== undefined && context.session.message_count > 0) {
      sessionParts.push(`💬 ${context.session.message_count} messages dans cette session`);
    }

    // Tools utilisés
    if (context.session.tools_used && Array.isArray(context.session.tools_used) && context.session.tools_used.length > 0) {
      const recentTools = context.session.tools_used.slice(-3).join(', ');
      sessionParts.push(`🔧 Tools utilisés: ${recentTools}`);
    }

    // Notes attachées
    if (context.session.attached_notes_count !== undefined && context.session.attached_notes_count > 0) {
      sessionParts.push(`📎 ${context.session.attached_notes_count} note(s) attachée(s)`);
    }

    if (sessionParts.length === 0) {
      return '';
    }

    logger.dev('[SessionContextProvider] ✅ Stats session injectées', {
      hasMessageCount: !!(context.session.message_count && context.session.message_count > 0),
      hasToolsUsed: !!(context.session.tools_used && context.session.tools_used.length > 0),
      hasAttachedNotes: !!(context.session.attached_notes_count && context.session.attached_notes_count > 0)
    });

    return `## Session\n${sessionParts.join('\n')}`;
  }
}

