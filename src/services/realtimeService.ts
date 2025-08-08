import { createClient } from '@supabase/supabase-js';
import { diffService, type DiffResult } from './diffService';
// import.*logger.*from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// // const supabase = [^;]+;]+;

interface PollingConfig {
  interval: number; // ms
  enabled: boolean;
  tables: string[];
  userId: string;
}

interface ChangeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
  timestamp: number;
  diff?: DiffResult; // Nouveau: diff des changements
  // Nouveau: support collaboratif
  collaboratorId?: string;
  collaboratorName?: string;
  sessionId?: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    timestamp: number;
  };
}

class RealtimeService {
  private config: PollingConfig;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private lastTimestamps: Map<string, string> = new Map();
  private lastCounts: Map<string, number> = new Map(); // Pour détecter INSERT/DELETE
  private listeners: Map<string, Set<(event: ChangeEvent) => void>> = new Map();

  constructor(config: PollingConfig) {
    this.config = config;
  }

  /**
   * Démarrer le polling pour une table spécifique
   */
  startPolling(table: string) {
    if (!this.config.enabled || this.intervals.has(table)) {
      logger.dev(`[Polling] ⚠️ Polling déjà actif ou désactivé pour ${table}`);
      return;
    }

    // 🚫 POLLING CONTINU COMPLÈTEMENT DÉSACTIVÉ
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[Polling] ⏸️ Polling continu désactivé pour ${table} - utilisation du polling déclenché par API uniquement`);
    }
    
    // Pas de setInterval - plus de polling continu qui matraque !
    // this.intervals.set(table, interval);
    // logger.dev(`[Polling] ✅ Polling démarré pour ${table}`);
  }

  /**
   * Arrêter le polling pour une table
   */
  stopPolling(table: string) {
    const interval = this.intervals.get(table);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(table);
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`⏹️ Polling arrêté pour ${table}`);
      }
    }
  }

  /**
   * Vérifier les changements dans une table
   */
  private async checkForChanges(table: string) {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.dev(`[Polling] 🔍 Vérification changements pour ${table}...`);
      }
      
      // 1. Vérifier les UPDATE (changements de contenu)
      await this.checkForUpdates(table);
      
      // 2. Vérifier les INSERT/DELETE (changements de structure)
      await this.checkForStructureChanges(table);
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.error(`❌ Erreur polling ${table}:`, error);
      }
    }
  }

  /**
   * Vérifier les mises à jour (UPDATE)
   */
  private async checkForUpdates(table: string) {
    const lastTimestamp = this.lastTimestamps.get(table);
    let query = supabase.from(table).select('*');

    logger.dev(`[Polling] 📊 Vérification UPDATE pour ${table} (lastTimestamp: ${lastTimestamp || 'aucun'})`);

    // Adapter la requête selon la table
    if (table === 'folders') {
      // Pour les dossiers, on se base sur `created_at` car il n'y a pas `updated_at`
      query = query.eq('user_id', this.config.userId).order('created_at', { ascending: false }).limit(50);
      if (lastTimestamp) {
        query = query.gt('created_at', lastTimestamp);
      }
    } else if (table === 'classeurs') {
      // Pour les classeurs, on se base sur `created_at` car il n'y a pas `updated_at`
      query = query.eq('user_id', this.config.userId).order('created_at', { ascending: false }).limit(50);
      if (lastTimestamp) {
        query = query.gt('created_at', lastTimestamp);
      }
    } else {
      // Pour les articles, on utilise `updated_at`
      query = query.eq('user_id', this.config.userId).order('updated_at', { ascending: false }).limit(50);
      if (lastTimestamp) {
        query = query.gt('updated_at', lastTimestamp);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error(`❌ Erreur polling UPDATE ${table}:`, error);
      return;
    }

    logger.dev(`[Polling] 📊 Résultats UPDATE ${table}: ${data?.length || 0} éléments`);

    if (data && data.length > 0) {
      // Mettre à jour le timestamp avec le plus récent de la liste
      let latestTimestamp: string;
      if (table === 'folders' || table === 'classeurs') {
        latestTimestamp = data.reduce((max, item) => item.created_at > max ? item.created_at : max, this.lastTimestamps.get(table) || '');
      } else {
        latestTimestamp = data.reduce((max, item) => item.updated_at > max ? item.updated_at : max, this.lastTimestamps.get(table) || '');
      }
      this.lastTimestamps.set(table, latestTimestamp);

      logger.dev(`[Polling] ✅ ${data.length} UPDATE(s) détecté(s) pour ${table}`);

      // Notifier les listeners pour chaque UPDATE avec diff
      data.forEach(item => {
        let diff: DiffResult | undefined;
        
        // Générer le diff pour les articles
        if (table === 'articles' && item.markdown_content) {
          const diffResult = diffService.generateDiff(item.id, item.markdown_content);
          if (diffResult) {
            diff = diffResult;
          }
        }

        const event = {
          table,
          eventType: 'UPDATE' as const,
          new: item,
          old: null, // On ne gère pas le 'old' pour l'instant pour simplifier
          timestamp: Date.now(),
          diff: diff, // On ajoute le diff ici
        };

        logger.dev(`[Polling] 📡 Notification UPDATE pour ${table}:`, item.id);
        this.notifyListeners(table, event);
      });
    } else {
      logger.dev(`[Polling] ⏭️ Aucun UPDATE détecté pour ${table}`);
    }
  }

  /**
   * Vérifier les changements de structure (INSERT/DELETE)
   */
  private async checkForStructureChanges(table: string) {
    logger.dev(`[Polling] 🔍 Vérification structure pour ${table}...`);
    
    // Compter le nombre total d'éléments
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.config.userId);

    if (error) {
      logger.error(`❌ Erreur polling structure ${table}:`, error);
      return;
    }

    const currentCount = count || 0;
    const lastCount = this.lastCounts.get(table);

    logger.dev(`[Polling] 📊 Comptage ${table}: actuel=${currentCount}, précédent=${lastCount || 'aucun'}`);

    if (lastCount !== undefined && lastCount !== currentCount) {
      // Changement de structure détecté
      if (currentCount > lastCount) {
        // INSERT détecté - récupérer le(s) nouvel(le)(s) élément(s)
        logger.dev(`[Polling] ➕ INSERT détecté pour ${table}: +${currentCount - lastCount} élément(s)`);
        
        const { data: newItems } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', this.config.userId)
          .order('created_at', { ascending: false })
          .limit(currentCount - lastCount);

        if (newItems) {
          newItems.forEach(item => {
            const event = {
              table,
              eventType: 'INSERT' as const,
              new: item,
              old: null,
              timestamp: Date.now()
            };
            
            logger.dev(`[Polling] 📡 Notification INSERT pour ${table}:`, item.id);
            this.notifyListeners(table, event);
          });
        }
      } else if (currentCount < lastCount) {
        // DELETE détecté
        logger.dev(`[Polling] 🗑️ DELETE détecté pour ${table}: -${lastCount - currentCount} élément(s)`);
        
        // Pour les DELETE, on ne peut pas récupérer l'élément supprimé
        // mais on peut notifier qu'une suppression a eu lieu
        const event = {
          table,
          eventType: 'DELETE' as const,
          new: null,
          old: { id: 'deleted', count: lastCount - currentCount }, // Informations sur la suppression
          timestamp: Date.now()
        };
        
        logger.dev(`[Polling] 📡 Notification DELETE pour ${table}`);
        this.notifyListeners(table, event);
      }

      // Mettre à jour le compteur
      this.lastCounts.set(table, currentCount);
      logger.dev(`[Polling] ✅ Compteur ${table} mis à jour: ${currentCount}`);
    } else if (lastCount === undefined) {
      // Première vérification - initialiser le compteur
      this.lastCounts.set(table, currentCount);
      logger.dev(`[Polling] 🎯 Initialisation compteur ${table}: ${currentCount}`);
    } else {
      logger.dev(`[Polling] ⏭️ Aucun changement de structure pour ${table}`);
    }
  }

  /**
   * Déclencher une vérification immédiate des changements
   * Utilisé après les appels API pour une mise à jour instantanée
   */
  async triggerImmediateCheck(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE') {
    logger.dev(`[RealtimeService] 🚀 Vérification immédiate pour ${table} (${operation})`);
    
    try {
      // Vérifier les changements immédiatement
      await this.checkForChanges(table);
      
      // Si c'est un INSERT, on peut aussi forcer une vérification UPDATE
      if (operation === 'INSERT') {
        logger.dev(`[RealtimeService] 🔄 Vérification UPDATE supplémentaire pour ${table}`);
        await this.checkForUpdates(table);
      }
      
      logger.dev(`[RealtimeService] ✅ Vérification immédiate terminée pour ${table}`);
    } catch (error) {
      logger.error(`[RealtimeService] ❌ Erreur vérification immédiate ${table}:`, error);
    }
  }

  /**
   * S'abonner aux changements d'une table
   */
  subscribe(table: string, callback: (event: ChangeEvent) => void) {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(callback);

    // Démarrer le polling si pas déjà actif
    if (!this.intervals.has(table)) {
      this.startPolling(table);
    }
  }

  /**
   * Se désabonner des changements
   */
  unsubscribe(table: string, _callback: (event: ChangeEvent) => void) {
    const listeners = this.listeners.get(table);
    if (listeners) {
      listeners.delete(_callback);
      if (listeners.size === 0) {
        this.stopPolling(table);
        this.listeners.delete(table);
      }
    }
  }

  /**
   * Notifier tous les listeners d'une table
   */
  private notifyListeners(table: string, event: ChangeEvent) {
    const listeners = this.listeners.get(table);
    if (listeners) {
      logger.dev(`[Polling] 📡 Notification ${listeners.size} listener(s) pour ${table}:`, event.eventType);
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          logger.error('❌ Erreur dans listener:', error);
        }
      });
    } else {
      logger.dev(`[Polling] ⚠️ Aucun listener pour ${table}`);
    }
  }

  /**
   * Arrêter tous les pollings
   */
  stopAll() {
    this.intervals.forEach((interval, table) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.listeners.clear();
    this.lastTimestamps.clear();
    this.lastCounts.clear();
    logger.dev('⏹️ Tous les pollings arrêtés');
  }
}

// Instance globale
let realtimeService: RealtimeService | null = null;

/**
 * Initialiser le service de temps réel
 */
export function initRealtimeService(userId: string) {
  realtimeService = new RealtimeService({
    interval: 2000, // 2 secondes
    enabled: true,
    tables: ['articles', 'folders', 'classeurs'],
    userId
  });
  return realtimeService;
}

/**
 * Obtenir l'instance du service
 */
export function getRealtimeService(): RealtimeService | null {
  return realtimeService;
}

/**
 * S'abonner aux changements d'une table
 */
export function subscribeToTable(table: string, callback: (event: ChangeEvent) => void) {
  const service = getRealtimeService();
  if (service) {
    service.subscribe(table, callback);
  }
}

/**
 * Se désabonner des changements
 */
export function unsubscribeFromTable(table: string, callback: (event: ChangeEvent) => void) {
  const service = getRealtimeService();
  if (service) {
    service.unsubscribe(table, callback);
  }
}

/**
 * Arrêter le service
 */
export function stopRealtimeService() {
  const service = getRealtimeService();
  if (service) {
    service.stopAll();
  }
} 