/**
 * TasksContextProvider - Injection des tâches comme message séparé (squelette pour extension future)
 * 
 * Responsabilités (à implémenter):
 * - Formater les tâches en cours
 * - Construire message contexte séparé du system message
 * 
 * Pattern: MessageContextProvider
 * Conformité: < 150 lignes, ZERO any, logging structuré
 * 
 * NOTE: Implémentation complète reportée (besoin de définir structure tâches)
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { ChatMessage } from '@/types/chat';
import type { MessageContextProvider } from '../types';
import type { ExtendedLLMContext, ContextInjectionOptions } from '../types';

/**
 * Structure de tâche (à définir selon les besoins)
 */
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  description?: string;
}

export class TasksContextProvider implements MessageContextProvider {
  readonly name = 'Tasks';

  shouldInject(context: ExtendedLLMContext, options?: ContextInjectionOptions): boolean {
    // TODO: Implémenter la vérification de présence de tâches
    // Exemple: return !!(context.tasks && context.tasks.length > 0);
    return options?.includeTasks === true && false; // Temporaire: toujours false
  }

  inject(
    context: ExtendedLLMContext,
    options?: ContextInjectionOptions
  ): ChatMessage | null {
    // TODO: Implémenter le formatage des tâches
    // Format suggéré:
    // ## Tasks
    // User has the following tasks:
    // - [ ] Task 1 (high priority, due: 2025-01-15)
    // - [x] Task 2 (completed)
    // ...
    
    logger.dev('[TasksContextProvider] ⚠️ Provider non implémenté (squelette pour extension future)');
    return null;
  }
}

