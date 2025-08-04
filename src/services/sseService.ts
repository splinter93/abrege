import { simpleLogger as logger } from '@/utils/logger';
interface SSEEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: number;
}

class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(event: SSEEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private url: string;
  private userId: string;

  constructor(url: string, userId: string) {
    this.url = url;
    this.userId = userId;
  }

  /**
   * Connecter au SSE
   */
  connect() {
    try {
      this.eventSource = new EventSource(`${this.url}?userId=${this.userId}`);
      
      this.eventSource.onopen = () => {
        logger.dev('🔌 SSE connecté');
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          this.handleEvent(data);
        } catch (error) {
          logger.error('❌ Erreur parsing SSE:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        logger.error('❌ Erreur SSE:', error);
        this.scheduleReconnect();
      };

    } catch (error) {
      logger.error('❌ Erreur connexion SSE:', error);
    }
  }

  /**
   * Gérer les événements reçus
   */
  private handleEvent(event: SSEEvent) {
    this.notifyListeners(event.table, event);
  }

  /**
   * Programmer une reconnexion
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      logger.dev(`🔄 Reconnexion SSE dans ${delay}ms (tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      logger.error('❌ Nombre maximum de tentatives de reconnexion SSE atteint');
    }
  }

  /**
   * S'abonner aux changements d'une table
   */
  subscribe(table: string, callback: (event: SSEEvent) => void) {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(callback);
  }

  /**
   * Se désabonner des changements
   */
  unsubscribe(table: string, callback: (event: SSEEvent) => void) {
    const listeners = this.listeners.get(table);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(table);
      }
    }
  }

  /**
   * Notifier tous les listeners d'une table
   */
  private notifyListeners(table: string, event: SSEEvent) {
    const listeners = this.listeners.get(table);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          logger.error('❌ Erreur dans listener SSE:', error);
        }
      });
    }
  }

  /**
   * Déconnecter le SSE
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// Instance globale
let sseService: SSEService | null = null;

/**
 * Initialiser le service SSE
 */
export function initSSEService(sseUrl: string, userId: string) {
  sseService = new SSEService(sseUrl, userId);
  sseService.connect();
  return sseService;
}

/**
 * Obtenir l'instance du service
 */
export function getSSEService(): SSEService | null {
  return sseService;
}

/**
 * S'abonner aux changements d'une table
 */
export function subscribeToTable(table: string, callback: (event: SSEEvent) => void) {
  const service = getSSEService();
  if (service) {
    service.subscribe(table, callback);
  }
}

/**
 * Se désabonner des changements
 */
export function unsubscribeFromTable(table: string, callback: (event: SSEEvent) => void) {
  const service = getSSEService();
  if (service) {
    service.unsubscribe(table, callback);
  }
}

/**
 * Arrêter le service
 */
export function stopSSEService() {
  const service = getSSEService();
  if (service) {
    service.disconnect();
  }
} 