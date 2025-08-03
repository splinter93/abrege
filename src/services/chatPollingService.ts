import { sessionSyncService } from './sessionSyncService';
import { useChatStore } from '../store/useChatStore';

/**
 * 🎯 Service de polling intelligent et ciblé pour le chat
 * Se déclenche uniquement après des actions spécifiques
 */
export class ChatPollingService {
  private static instance: ChatPollingService;
  private isPolling = false;
  private pollingTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): ChatPollingService {
    if (!ChatPollingService.instance) {
      ChatPollingService.instance = new ChatPollingService();
    }
    return ChatPollingService.instance;
  }

  /**
   * 🎯 Déclencher un polling ciblé après une action
   * Utilise un debounce pour éviter les pollings multiples
   */
  async triggerPolling(action: string, delay: number = 500): Promise<void> {
    console.log(`[ChatPolling] 🎯 Polling déclenché après: ${action}`);
    
    // Ne pas déclencher de polling pour les actions de messages
    // car les messages sont rechargés directement après
    if (action.includes('message') || action.includes('LLM')) {
      console.log(`[ChatPolling] ⏭️ Polling ignoré pour: ${action} (rechargement direct)`);
      return;
    }
    
    // Annuler le polling précédent s'il existe
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }

    // Déclencher le polling avec un délai
    this.pollingTimeout = setTimeout(async () => {
      await this.performPolling(action);
    }, delay);
  }

  /**
   * 🔄 Effectuer le polling de synchronisation
   */
  private async performPolling(triggerAction: string): Promise<void> {
    if (this.isPolling) {
      console.log('[ChatPolling] ⏳ Polling déjà en cours, ignoré');
      return;
    }

    this.isPolling = true;
    console.log(`[ChatPolling] 🔄 Début polling (déclenché par: ${triggerAction})`);

    try {
      // Synchroniser les sessions depuis la DB
      const result = await sessionSyncService.syncSessionsFromDB();
      
      if (result.success && result.sessions) {
        // Fusionner intelligemment avec les données existantes
        const { setSessions, sessions: currentSessions } = useChatStore.getState();
        
        // Fusionner les sessions en préservant les messages optimistes
        const mergedSessions = result.sessions.map(dbSession => {
          const currentSession = currentSessions.find(s => s.id === dbSession.id);
          if (currentSession && currentSession.thread.length > dbSession.thread.length) {
            // Garder les messages optimistes si ils sont plus récents
            return {
              ...dbSession,
              thread: currentSession.thread
            };
          }
          return dbSession;
        });
        
        setSessions(mergedSessions);
        console.log(`[ChatPolling] ✅ Polling réussi: ${result.sessions.length} sessions synchronisées (fusion intelligente)`);
      } else {
        console.log('[ChatPolling] ⚠️ Polling échoué:', result.error);
      }
    } catch (error) {
      console.error('[ChatPolling] ❌ Erreur polling:', error);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * 🛑 Arrêter le polling en cours
   */
  stopPolling(): void {
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    this.isPolling = false;
    console.log('[ChatPolling] 🛑 Polling arrêté');
  }
}

// Export de l'instance singleton
export const chatPollingService = ChatPollingService.getInstance(); 