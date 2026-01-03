/**
 * CanvaContextProvider - Injection du contexte Canva dans le system message
 * Responsabilités:
 * - Sessions Canva ouvertes/fermées
 * - Note active dans Canva
 * - Résumé des sessions
 * 
 * Pattern: SystemContextProvider
 * Conformité: < 150 lignes, ZERO any, logging structuré
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { SystemContextProvider } from '../types';
import type { AgentSystemConfig } from '@/services/llm/SystemMessageBuilder';
import type { ExtendedLLMContext, ContextInjectionOptions } from '../types';
import { buildCanvaContextSection } from './CanvaContextProviderHelper';

export class CanvaContextProvider implements SystemContextProvider {
  readonly name = 'Canva';
  readonly priority = 40; // Après Session

  shouldInject(context: ExtendedLLMContext, _options?: ContextInjectionOptions): boolean {
    return !!(context.canva_context && context.canva_context.canvases.length > 0);
  }

  inject(
    _agentConfig: AgentSystemConfig,
    context: ExtendedLLMContext,
    _options?: ContextInjectionOptions
  ): string {
    if (!context.canva_context) {
      return '';
    }

    const canvaSection = buildCanvaContextSection(context.canva_context);
    if (!canvaSection) {
      return '';
    }

    logger.dev('[CanvaContextProvider] ✅ Contexte Canva injecté', {
      sessionsCount: context.canva_context.canvases.length,
      hasActiveNote: !!context.canva_context.activeNote
    });

    return canvaSection;
  }
}

