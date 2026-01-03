/**
 * UserStatsContextProvider - Injection des stats utilisateur dans le system message
 * Responsabilités:
 * - Dernière connexion
 * - Stats utilisateur (notes_count, sessions_count)
 * - Notifications non lues
 * 
 * Pattern: SystemContextProvider
 * Conformité: < 150 lignes, ZERO any, logging structuré
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { SystemContextProvider } from '../types';
import type { AgentSystemConfig } from '@/services/llm/SystemMessageBuilder';
import type { ExtendedLLMContext, ContextInjectionOptions } from '../types';

export class UserStatsContextProvider implements SystemContextProvider {
  readonly name = 'UserStats';
  readonly priority = 20; // Après UIContext

  shouldInject(context: ExtendedLLMContext, _options?: ContextInjectionOptions): boolean {
    return !!(
      context.user?.last_login ||
      context.user?.stats ||
      (context.user?.notifications_count !== undefined && context.user.notifications_count > 0)
    );
  }

  inject(
    _agentConfig: AgentSystemConfig,
    context: ExtendedLLMContext,
    _options?: ContextInjectionOptions
  ): string {
    if (!context.user) {
      return '';
    }

    const userParts: string[] = [];

    // Dernière connexion
    if (context.user.last_login) {
      const lastLoginAgo = this.getTimeAgo(context.user.last_login);
      userParts.push(`🕒 Dernière connexion: ${lastLoginAgo}`);
    }

    // Stats utilisateur
    if (context.user.stats) {
      const stats = context.user.stats;
      if (stats.notes_count !== undefined || stats.sessions_count !== undefined) {
        const notesStr = stats.notes_count !== undefined ? `${stats.notes_count} notes` : '';
        const sessionsStr = stats.sessions_count !== undefined ? `${stats.sessions_count} sessions` : '';
        const statsStr = [notesStr, sessionsStr].filter(Boolean).join(' | ');
        if (statsStr) {
          userParts.push(`📊 ${statsStr}`);
        }
      }
    }

    // Notifications
    if (context.user.notifications_count !== undefined && context.user.notifications_count > 0) {
      userParts.push(`🔔 ${context.user.notifications_count} notifications non lues`);
    }

    if (userParts.length === 0) {
      return '';
    }

    logger.dev('[UserStatsContextProvider] ✅ Stats utilisateur injectées', {
      hasLastLogin: !!context.user.last_login,
      hasStats: !!context.user.stats,
      hasNotifications: !!(context.user.notifications_count && context.user.notifications_count > 0)
    });

    return `## Utilisateur\n${userParts.join('\n')}`;
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
      logger.error('[UserStatsContextProvider] ❌ Erreur getTimeAgo:', error);
      return 'récemment';
    }
  }
}

