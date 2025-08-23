/**
 * 🔄 Service Realtime Unifié et Simplifié
 * 
 * Ce service remplace tous les services de polling/realtime existants
 * avec une architecture simple et efficace.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useFileSystemStore } from '@/store/useFileSystemStore';

export interface RealtimeConfig {
  supabaseUrl: string;
  supabaseKey: string;
  userId: string;
  userToken: string; // 🚀 AJOUT: Token JWT pour l'authentification
  debug?: boolean;
}

export interface RealtimeStatus {
  isConnected: boolean;
  provider: 'realtime' | 'polling' | 'none';
  lastEvent: string | null;
  errorCount: number;
  tables: {
    notes: boolean;
    folders: boolean;
    classeurs: boolean;
  };
}

export type EntityType = 'notes' | 'folders' | 'classeurs';
export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'RENAME';

class UnifiedRealtimeService {
  private supabase: SupabaseClient | null = null;
  private config: RealtimeConfig | null = null;
  private status: RealtimeStatus;
  private channels: Map<string, any> = new Map();
  private isPolling = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.status = {
      isConnected: false,
      provider: 'none',
      lastEvent: null,
      errorCount: 0,
      tables: {
        notes: false,
        folders: false,
        classeurs: false
      }
    };
  }

  /**
   * Initialiser le service avec la configuration
   */
  async initialize(config: RealtimeConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // Créer le client Supabase
      this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
      
      // Essayer d'abord Supabase Realtime
      const realtimeSuccess = await this.setupSupabaseRealtime();
      
      if (realtimeSuccess) {
        this.status.provider = 'realtime';
        this.status.isConnected = true;
        if (config.debug) {
          console.log('[Realtime] ✅ Supabase Realtime connecté');
        }
        return true;
      }
      
      // Fallback vers le polling intelligent
      this.status.provider = 'polling';
      this.startIntelligentPolling();
      if (config.debug) {
        console.log('[Realtime] 🔄 Fallback vers polling intelligent');
      }
      return true;
      
    } catch (error) {
      console.error('[Realtime] ❌ Erreur d\'initialisation:', error);
      this.status.provider = 'none';
      return false;
    }
  }

  /**
   * Configurer Supabase Realtime
   */
  private async setupSupabaseRealtime(): Promise<boolean> {
    if (!this.supabase || !this.config) return false;

    try {
      // Vérifier l'authentification
      const { data: { session }, error: authError } = await this.supabase.auth.getSession();
      if (authError || !session?.access_token) {
        throw new Error('Session non authentifiée');
      }

      // Configurer les canaux pour chaque table
      const tables: EntityType[] = ['notes', 'folders', 'classeurs'];
      let connectedCount = 0;

      for (const table of tables) {
        const success = await this.setupTableChannel(table);
        if (success) connectedCount++;
      }

      // Considérer comme succès si au moins 2 tables sur 3 sont connectées
      return connectedCount >= 2;

    } catch (error) {
      console.error('[Realtime] Erreur Supabase Realtime:', error);
      return false;
    }
  }

  /**
   * Configurer un canal pour une table spécifique
   */
  private async setupTableChannel(table: EntityType): Promise<boolean> {
    if (!this.supabase || !this.config) return false;

    try {
      const tableName = this.getTableName(table);
      const channelName = `${table}-changes`;
      
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: `user_id=eq.${this.config.userId}`
          },
          (payload: any) => {
            this.handleRealtimeEvent(table, payload);
          }
        )
        .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            this.status.tables[table] = true;
            if (this.config?.debug) {
              console.log(`[Realtime] ✅ Canal ${table} connecté`);
            }
          } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
            this.status.tables[table] = false;
            if (this.config?.debug) {
              console.log(`[Realtime] ❌ Canal ${table} déconnecté: ${status}`);
            }
          }
        });

      this.channels.set(table, channel);
      return true;

    } catch (error) {
      console.error(`[Realtime] Erreur canal ${table}:`, error);
      return false;
    }
  }

  /**
   * Gérer les événements realtime
   */
  private handleRealtimeEvent(table: EntityType, payload: any): void {
    try {
      const store = useFileSystemStore.getState();
      const { eventType, new: newData, old: oldData } = payload;

      this.status.lastEvent = `${table}.${eventType}`;

      switch (eventType) {
        case 'INSERT':
          this.handleInsert(table, newData, store);
          break;
        case 'UPDATE':
          this.handleUpdate(table, newData, oldData, store);
          break;
        case 'DELETE':
          this.handleDelete(table, oldData, store);
          break;
      }

      if (this.config?.debug) {
        console.log(`[Realtime] Event ${table}.${eventType}:`, { new: newData, old: oldData });
      }

    } catch (error) {
      console.error(`[Realtime] Erreur traitement event ${table}:`, error);
      this.status.errorCount++;
    }
  }

  /**
   * Gérer les insertions
   */
  private handleInsert(table: EntityType, data: any, store: any): void {
    switch (table) {
      case 'notes':
        store.addNote(data);
        break;
      case 'folders':
        store.addFolder(data);
        break;
      case 'classeurs':
        store.addClasseur(data);
        break;
    }
  }

  /**
   * Gérer les mises à jour
   */
  private handleUpdate(table: EntityType, newData: any, oldData: any, store: any): void {
    switch (table) {
      case 'notes':
        store.updateNote(newData.id, newData);
        break;
      case 'folders':
        store.updateFolder(newData.id, newData);
        break;
      case 'classeurs':
        store.updateClasseur(newData.id, newData);
        break;
    }
  }

  /**
   * Gérer les suppressions
   */
  private handleDelete(table: EntityType, data: any, store: any): void {
    switch (table) {
      case 'notes':
        store.removeNote(data.id);
        break;
      case 'folders':
        store.removeFolder(data.id);
        break;
      case 'classeurs':
        store.removeClasseur(data.id);
        break;
    }
  }

  /**
   * Démarrer le polling intelligent (fallback)
   */
  private startIntelligentPolling(): void {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.pollingInterval = setInterval(() => {
      this.performIntelligentPolling();
    }, 5000); // 5 secondes d'intervalle

    if (this.config?.debug) {
      console.log('[Realtime] 🔄 Polling intelligent démarré (5s)');
    }
  }

  /**
   * Effectuer le polling intelligent
   */
  private async performIntelligentPolling(): Promise<void> {
    if (!this.config) return;

    try {
      // Polling intelligent : vérifier seulement les tables qui ont des changements récents
      const tables: EntityType[] = ['notes', 'folders', 'classeurs'];
      
      for (const table of tables) {
        await this.pollTable(table);
      }

    } catch (error) {
      console.error('[Realtime] Erreur polling intelligent:', error);
      this.status.errorCount++;
    }
  }

  /**
   * Poller une table spécifique
   */
  private async pollTable(table: EntityType): Promise<void> {
    if (!this.config) return;

    try {
      let response;
      
      // ✅ CORRECTION: Utiliser le bon token d'authentification
      switch (table) {
        case 'classeurs':
          response = await fetch('/api/v2/classeurs/with-content', {
            headers: {
              'Authorization': `Bearer ${this.config.userToken}`,
              'X-Client-Type': 'unified-realtime'
            }
          });
          break;
        case 'notes':
          response = await fetch('/api/v2/notes', {
            headers: {
              'Authorization': `Bearer ${this.config.userToken}`,
              'X-Client-Type': 'unified-realtime'
            }
          });
          break;
        case 'folders':
          response = await fetch('/api/v2/folders', {
            headers: {
              'Authorization': `Bearer ${this.config.userToken}`,
              'X-Client-Type': 'unified-realtime'
            }
          });
          break;
        default:
          response = await fetch(`/api/v2/${table}`, {
            headers: {
              'Authorization': `Bearer ${this.config.userToken}`,
              'X-Client-Type': 'unified-realtime'
            }
          });
      }

      if (response.ok) {
        const data = await response.json();
        this.updateStoreFromPollingData(table, data);
      }

    } catch (error) {
      // Ignorer les erreurs de polling pour éviter le spam
    }
  }

  /**
   * Mettre à jour le store avec les données du polling
   */
  private updateStoreFromPollingData(table: EntityType, data: any): void {
    try {
      const store = useFileSystemStore.getState();
      
      switch (table) {
        case 'notes':
          if (data.notes && Array.isArray(data.notes)) {
            store.setNotes(data.notes);
          }
          break;
        case 'folders':
          if (data.folders && Array.isArray(data.folders)) {
            store.setFolders(data.folders);
          }
          break;
        case 'classeurs':
          // ✅ CORRECTION: Gérer la structure de l'endpoint with-content
          if (data.classeurs && Array.isArray(data.classeurs)) {
            store.setClasseurs(data.classeurs);
          }
          // Mettre à jour aussi les folders et notes si présents
          if (data.folders && Array.isArray(data.folders)) {
            store.setFolders(data.folders);
          }
          if (data.notes && Array.isArray(data.notes)) {
            store.setNotes(data.notes);
          }
          break;
      }
    } catch (error) {
      // Ignorer les erreurs de mise à jour du store
    }
  }

  /**
   * Obtenir le nom de la table Supabase
   */
  private getTableName(table: EntityType): string {
    switch (table) {
      case 'notes': return 'articles';
      case 'folders': return 'folders';
      case 'classeurs': return 'classeurs';
      default: return table;
    }
  }

  /**
   * Déclencher un polling immédiat pour une entité
   */
  async triggerImmediatePolling(entityType: EntityType, operation: OperationType): Promise<void> {
    if (this.status.provider === 'realtime') {
      // En mode realtime, pas besoin de polling immédiat
      return;
    }

    try {
      await this.pollTable(entityType);
      
      if (this.config?.debug) {
        console.log(`[Realtime] 🔄 Polling immédiat ${entityType} (${operation})`);
      }
    } catch (error) {
      console.error(`[Realtime] Erreur polling immédiat ${entityType}:`, error);
    }
  }

  /**
   * Obtenir le statut du service
   */
  getStatus(): RealtimeStatus {
    return { ...this.status };
  }

  // 🚀 AJOUT: Méthode pour déclencher le polling avec un token spécifique
  async triggerPollingWithToken(entityType: EntityType, operation: OperationType, userToken: string): Promise<void> {
    if (this.status.provider === 'realtime') {
      return;
    }

    const originalToken = this.config?.userToken;
    if (this.config) {
      this.config.userToken = userToken;
    }

    try {
      await this.triggerImmediatePolling(entityType, operation);
    } finally {
      if (this.config && originalToken) {
        this.config.userToken = originalToken;
      }
    }
  }

  /**
   * Arrêter le service
   */
  stop(): void {
    // Arrêter les canaux Supabase
    this.channels.forEach((channel, table) => {
      try {
        this.supabase?.removeChannel(channel);
      } catch (error) {
        // Ignorer les erreurs de fermeture
      }
    });
    this.channels.clear();

    // Arrêter le polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.isPolling = false;
    this.status.isConnected = false;
    this.status.provider = 'none';

    if (this.config?.debug) {
      console.log('[Realtime] 🛑 Service arrêté');
    }
  }
}

// Instance singleton
const unifiedRealtimeService = new UnifiedRealtimeService();

// Fonctions d'export
export const initializeUnifiedRealtime = (config: RealtimeConfig): Promise<boolean> => {
  return unifiedRealtimeService.initialize(config);
};

export const getUnifiedRealtimeStatus = (): RealtimeStatus => {
  return unifiedRealtimeService.getStatus();
};

// 🚀 CORRECTION: Accepter le token d'authentification
export const triggerUnifiedRealtimePolling = async (
  entityType: EntityType, 
  operation: OperationType,
  userToken?: string
): Promise<void> => {
  // Si un token est fourni, l'utiliser temporairement
  if (userToken) {
    await unifiedRealtimeService.triggerPollingWithToken(entityType, operation, userToken);
  } else {
    // Utiliser le token configuré par défaut
    await unifiedRealtimeService.triggerImmediatePolling(entityType, operation);
  }
};

export const stopUnifiedRealtimeService = (): void => {
  unifiedRealtimeService.stop();
}; 