import { createClient } from '@supabase/supabase-js';
import { diffService, type DiffResult } from './diffService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PollingConfig {
  interval: number; // ms
  enabled: boolean;
  tables: string[];
  userId: string;
}

interface ChangeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
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
    if (!this.config.enabled || this.intervals.has(table)) return;

    const interval = setInterval(async () => {
      await this.checkForChanges(table);
    }, this.config.interval);

    this.intervals.set(table, interval);
    console.log(`🔄 Polling démarré pour ${table}`);
  }

  /**
   * Arrêter le polling pour une table
   */
  stopPolling(table: string) {
    const interval = this.intervals.get(table);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(table);
      console.log(`⏹️ Polling arrêté pour ${table}`);
    }
  }

  /**
   * Vérifier les changements dans une table
   */
  private async checkForChanges(table: string) {
    try {
      // 1. Vérifier les UPDATE (changements de contenu)
      await this.checkForUpdates(table);
      
      // 2. Vérifier les INSERT/DELETE (changements de structure)
      await this.checkForStructureChanges(table);
      
    } catch (error) {
      console.error(`❌ Erreur polling ${table}:`, error);
    }
  }

  /**
   * Vérifier les mises à jour (UPDATE)
   */
  private async checkForUpdates(table: string) {
    const lastTimestamp = this.lastTimestamps.get(table);
    let query = supabase.from(table).select('*');

    // Adapter la requête selon la table
    if (table === 'folders') {
      query = query.eq('user_id', this.config.userId).order('created_at', { ascending: false }).limit(10);
      if (lastTimestamp) {
        query = query.gt('created_at', lastTimestamp);
      }
    } else {
      query = query.eq('user_id', this.config.userId).order('updated_at', { ascending: false }).limit(10);
      if (lastTimestamp) {
        query = query.gt('updated_at', lastTimestamp);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error(`❌ Erreur polling UPDATE ${table}:`, error);
      return;
    }

    if (data && data.length > 0) {
      // Mettre à jour le timestamp
      const latestTimestamp = table === 'folders' ? data[0].created_at : data[0].updated_at;
      this.lastTimestamps.set(table, latestTimestamp);

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

        this.notifyListeners(table, {
          table,
          eventType: 'UPDATE',
          new: item,
          old: null,
          timestamp: Date.now(),
          diff // Inclure le diff dans l'événement
        });
      });
    }
  }

  /**
   * Vérifier les changements de structure (INSERT/DELETE)
   */
  private async checkForStructureChanges(table: string) {
    // Compter le nombre total d'éléments
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.config.userId);

    if (error) {
      console.error(`❌ Erreur polling structure ${table}:`, error);
      return;
    }

    const currentCount = count || 0;
    const lastCount = this.lastCounts.get(table);

    if (lastCount !== undefined && lastCount !== currentCount) {
      // Changement de structure détecté
      if (currentCount > lastCount) {
        // INSERT détecté - récupérer le nouvel élément
        const { data: newItems } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', this.config.userId)
          .order('created_at', { ascending: false })
          .limit(currentCount - lastCount);

        if (newItems) {
          newItems.forEach(item => {
            this.notifyListeners(table, {
              table,
              eventType: 'INSERT',
              new: item,
              old: null,
              timestamp: Date.now()
            });
          });
        }
      } else if (currentCount < lastCount) {
        // DELETE détecté
        this.notifyListeners(table, {
          table,
          eventType: 'DELETE',
          new: null,
          old: { id: 'deleted' }, // On ne peut pas récupérer l'ancien élément
          timestamp: Date.now()
        });
      }

      // Mettre à jour le compteur
      this.lastCounts.set(table, currentCount);
    } else if (lastCount === undefined) {
      // Première vérification - initialiser le compteur
      this.lastCounts.set(table, currentCount);
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
  unsubscribe(table: string, callback: (event: ChangeEvent) => void) {
    const listeners = this.listeners.get(table);
    if (listeners) {
      listeners.delete(callback);
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
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('❌ Erreur dans listener:', error);
        }
      });
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
    console.log('⏹️ Tous les pollings arrêtés');
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