/**
 * 🎯 Service de Polling Déclenché par Actions UI
 * 
 * Ce service déclenche un polling ciblé après chaque action UI.
 * Principe : 1 Action UI = 1 Polling Ciblé = 1 Mise à jour UI
 */

import { targetedPollingService, type OperationType } from './targetedPollingService';
import { simpleLogger as logger } from '@/utils/logger';

export type UIActionType = 
  | 'note_created'
  | 'note_updated' 
  | 'note_deleted'
  | 'note_moved'
  | 'note_renamed'
  | 'folder_created'
  | 'folder_updated'
  | 'folder_deleted'
  | 'folder_moved'
  | 'folder_renamed'
  | 'classeur_created'
  | 'classeur_updated'
  | 'classeur_deleted'
  | 'classeur_renamed';

class UIActionPollingService {
  private static instance: UIActionPollingService;

  private constructor() {}

  static getInstance(): UIActionPollingService {
    if (!UIActionPollingService.instance) {
      UIActionPollingService.instance = new UIActionPollingService();
    }
    return UIActionPollingService.instance;
  }

  /**
   * 🎯 Déclencher le polling après une action UI
   */
  async triggerPollingAfterAction(action: UIActionType): Promise<void> {
    logger.dev(`[UIActionPolling] 🎯 Action UI détectée: ${action}`);

    try {
      switch (action) {
        // Actions sur les notes
        case 'note_created':
        case 'note_updated':
        case 'note_deleted':
        case 'note_moved':
        case 'note_renamed':
          await targetedPollingService.pollNotesOnce(this.getOperationType(action));
          break;

        // Actions sur les dossiers
        case 'folder_created':
        case 'folder_updated':
        case 'folder_deleted':
        case 'folder_moved':
        case 'folder_renamed':
          await targetedPollingService.pollFoldersOnce(this.getOperationType(action));
          break;

        // Actions sur les classeurs
        case 'classeur_created':
        case 'classeur_updated':
        case 'classeur_deleted':
        case 'classeur_renamed':
          await targetedPollingService.pollClasseursOnce(this.getOperationType(action));
          break;

        default:
          logger.warn(`[UIActionPolling] ⚠️ Action non reconnue: ${action}`);
          break;
      }

      logger.dev(`[UIActionPolling] ✅ Polling déclenché pour: ${action}`);
    } catch (error) {
      logger.error(`[UIActionPolling] ❌ Erreur polling pour ${action}:`, error);
    }
  }

  /**
   * 🔄 Déclencher le polling pour tout après une action importante
   */
  async triggerFullPollingAfterAction(action: UIActionType): Promise<void> {
    logger.dev(`[UIActionPolling] 🎯 Action importante détectée: ${action} - Polling complet`);

    try {
      await targetedPollingService.pollAllOnce(this.getOperationType(action));
      logger.dev(`[UIActionPolling] ✅ Polling complet déclenché pour: ${action}`);
    } catch (error) {
      logger.error(`[UIActionPolling] ❌ Erreur polling complet pour ${action}:`, error);
    }
  }

  /**
   * 🔧 Convertir l'action UI en type d'opération
   */
  private getOperationType(action: UIActionType): OperationType {
    if (action.includes('created')) return 'CREATE';
    if (action.includes('updated')) return 'UPDATE';
    if (action.includes('deleted')) return 'DELETE';
    if (action.includes('moved')) return 'MOVE';
    if (action.includes('renamed')) return 'RENAME';
    return 'UPDATE';
  }

  /**
   * 🎯 Déclencher le polling immédiatement (pour les actions critiques)
   */
  async triggerImmediatePolling(entity: 'notes' | 'folders' | 'classeurs' | 'all', operation: OperationType = 'UPDATE'): Promise<void> {
    logger.dev(`[UIActionPolling] 🚀 Polling immédiat: ${entity} (${operation})`);

    try {
      switch (entity) {
        case 'notes':
          await targetedPollingService.pollNotesOnce(operation);
          break;
        case 'folders':
          await targetedPollingService.pollFoldersOnce(operation);
          break;
        case 'classeurs':
          await targetedPollingService.pollClasseursOnce(operation);
          break;
        case 'all':
          await targetedPollingService.pollAllOnce(operation);
          break;
      }

      logger.dev(`[UIActionPolling] ✅ Polling immédiat terminé: ${entity}`);
    } catch (error) {
      logger.error(`[UIActionPolling] ❌ Erreur polling immédiat ${entity}:`, error);
    }
  }
}

// Export singleton
export const uiActionPollingService = UIActionPollingService.getInstance();

// Fonctions utilitaires pour déclencher le polling depuis n'importe où
export const triggerPollingAfterNoteAction = (action: UIActionType) => 
  uiActionPollingService.triggerPollingAfterAction(action);

export const triggerPollingAfterFolderAction = (action: UIActionType) => 
  uiActionPollingService.triggerPollingAfterAction(action);

export const triggerPollingAfterClasseurAction = (action: UIActionType) => 
  uiActionPollingService.triggerPollingAfterAction(action);

export const triggerImmediatePolling = (entity: 'notes' | 'folders' | 'classeurs' | 'all', operation?: OperationType) => 
  uiActionPollingService.triggerImmediatePolling(entity, operation);
