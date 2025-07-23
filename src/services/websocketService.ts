interface WebSocketMessage {
  type: 'CHANGE' | 'PING' | 'PONG';
  table?: string;
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
  data?: any;
  timestamp?: number;
}

interface ChangeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(event: ChangeEvent) => void>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private url: string;
  private userId: string;

  constructor(url: string, userId: string) {
    this.url = url;
    this.userId = userId;
  }

  /**
   * Connecter au WebSocket
   */
  connect() {
    try {
      this.ws = new WebSocket(`${this.url}?userId=${this.userId}`);
      
      this.ws.onopen = () => {
        console.log('🔌 WebSocket connecté');
        this.reconnectAttempts = 0;
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Erreur parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket déconnecté');
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
      };

    } catch (error) {
      console.error('❌ Erreur connexion WebSocket:', error);
    }
  }

  /**
   * Gérer les messages reçus
   */
  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'CHANGE':
        if (message.table && message.eventType && message.data) {
          this.notifyListeners(message.table, {
            table: message.table,
            eventType: message.eventType,
            new: message.data.new,
            old: message.data.old,
            timestamp: message.timestamp || Date.now()
          });
        }
        break;
      
      case 'PONG':
        // Réponse au ping, connexion active
        break;
      
      default:
        console.warn('⚠️ Message WebSocket inconnu:', message);
    }
  }

  /**
   * Démarrer le ping pour maintenir la connexion
   */
  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000); // Ping toutes les 30 secondes
  }

  /**
   * Arrêter le ping
   */
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Programmer une reconnexion
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Reconnexion dans ${delay}ms (tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
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
  }

  /**
   * Se désabonner des changements
   */
  unsubscribe(table: string, callback: (event: ChangeEvent) => void) {
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
   * Déconnecter le WebSocket
   */
  disconnect() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Instance globale
let websocketService: WebSocketService | null = null;

/**
 * Initialiser le service WebSocket
 */
export function initWebSocketService(wsUrl: string, userId: string) {
  websocketService = new WebSocketService(wsUrl, userId);
  websocketService.connect();
  return websocketService;
}

/**
 * Obtenir l'instance du service
 */
export function getWebSocketService(): WebSocketService | null {
  return websocketService;
}

/**
 * S'abonner aux changements d'une table
 */
export function subscribeToTable(table: string, callback: (event: ChangeEvent) => void) {
  const service = getWebSocketService();
  if (service) {
    service.subscribe(table, callback);
  }
}

/**
 * Se désabonner des changements
 */
export function unsubscribeFromTable(table: string, callback: (event: ChangeEvent) => void) {
  const service = getWebSocketService();
  if (service) {
    service.unsubscribe(table, callback);
  }
}

/**
 * Arrêter le service
 */
export function stopWebSocketService() {
  const service = getWebSocketService();
  if (service) {
    service.disconnect();
  }
} 