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

interface WebSocketServiceOptions {
  url: string;
  token: string;
  debug?: boolean;
  onError?: (err: any) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(event: any) => void>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private url: string;
  private token: string;
  private debug: boolean;
  private onError?: (err: any) => void;

  constructor(options: WebSocketServiceOptions) {
    this.url = options.url || process.env.NEXT_PUBLIC_WS_URL || '';
    this.token = options.token;
    this.debug = !!options.debug;
    this.onError = options.onError;
  }

  /**
   * Connecter au WebSocket
   */
  connect() {
    try {
      this.ws = new WebSocket(`${this.url}?token=${this.token}`);
      
      this.ws.onopen = () => {
        if (this.debug) console.log('🔌 WebSocket connecté');
        this.reconnectAttempts = 0;
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          if (this.debug) console.error('❌ Erreur parsing message:', error);
          if (this.onError) this.onError(error);
        }
      };

      this.ws.onclose = () => {
        if (this.debug) console.log('🔌 WebSocket déconnecté');
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        if (this.debug) console.error('❌ Erreur WebSocket:', error);
        if (this.onError) this.onError(error);
      };

    } catch (error) {
      if (this.debug) console.error('❌ Erreur connexion WebSocket:', error);
      if (this.onError) this.onError(error);
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
        if (this.debug) console.warn('⚠️ Message WebSocket inconnu:', message);
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
      
      if (this.debug) console.log(`🔄 Reconnexion dans ${delay}ms (tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      if (this.debug) console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
    }
  }

  /**
   * S'abonner aux changements d'une table ou à tous les events (table === 'all')
   */
  subscribe(table: string, callback: (event: any) => void) {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(callback);
  }

  /**
   * Se désabonner des changements
   */
  unsubscribe(table: string, callback: (event: any) => void) {
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
  private notifyListeners(table: string, event: any) {
    const listeners = this.listeners.get(table);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          if (this.debug) console.error('❌ Erreur dans listener:', error);
        }
      });
    }
    // Notifier les listeners génériques (table === 'all')
    if (table !== 'all' && this.listeners.has('all')) {
      this.listeners.get('all')!.forEach(callback => {
        try {
          callback({ type: `${table}.${event.eventType?.toLowerCase?.() || 'event'}`, payload: event.new || event.data, timestamp: event.timestamp });
        } catch (error) {
          if (this.debug) console.error('❌ Erreur dans listener all:', error);
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
    // Nettoyage listeners
    this.listeners.clear();
  }
}

// Instance globale
let websocketService: WebSocketService | null = null;

/**
 * Initialiser le service WebSocket
 */
export function initWebSocketService(wsUrl: string, token: string, debug = false, onError?: (err: any) => void) {
  websocketService = new WebSocketService({ url: wsUrl, token, debug, onError });
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