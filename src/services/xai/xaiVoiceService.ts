/**
 * XAIVoiceService - Service pour gérer les connexions WebSocket XAI Voice
 * 
 * Gère :
 * - Connexion WebSocket à wss://api.x.ai/v1/realtime
 * - Envoi/réception de messages audio (base64)
 * - Configuration de session (voix, instructions)
 * - Reconnexion automatique
 */

'use client';

import { logger, LogCategory } from '@/utils/logger';
import type {
  XAIVoiceMessageType,
  XAIVoiceSessionConfig,
  XAIVoiceMessage,
  XAIVoiceCallbacks,
  XAIVoiceConnectionState
} from './types';
export type {
  XAIVoiceMessageType,
  XAIVoiceSessionConfig,
  XAIVoiceMessage,
  XAIVoiceAudioDeltaMessage,
  XAIVoiceCallbacks,
  XAIVoiceConnectionState
} from './types';
import { handleXAIVoiceMessage } from './messageHandler';
import { ReconnectManager } from './reconnectManager';

/**
 * Service XAI Voice
 */
export class XAIVoiceService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private callbacks: XAIVoiceCallbacks = {};
  private state: XAIVoiceConnectionState = 'disconnected';
  private reconnectManager: ReconnectManager;
  private sessionConfigured = false;
  private turnDetectionType: 'server_vad' | 'client_vad' | 'none' = 'server_vad';
  private responseModalities: Array<'text' | 'audio'> = ['text', 'audio'];
  private idleTimeout: NodeJS.Timeout | null = null;
  private lastActivity = 0;
  private inFlight = false; // Flag pour éviter fermeture prématurée pendant traitement
  private pendingDisconnect: (() => void) | null = null; // Callback de disconnect en attente

  constructor() {
    this.reconnectManager = new ReconnectManager({
      maxAttempts: 3,
      token: null,
      connect: this.connect.bind(this) as (token: string, callbacks?: unknown) => Promise<void>,
      callbacks: {}
    });
  }

  /**
   * Connecter au service XAI Voice
   */
  async connect(token: string, callbacks: XAIVoiceCallbacks = {}): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.warn(LogCategory.AUDIO, '[XAIVoiceService] Connexion déjà ouverte');
      return;
    }

    this.token = token;
    this.callbacks = callbacks;
    this.state = 'connecting';

    try {
      // Utiliser le proxy WebSocket au lieu de la connexion directe XAI
      // Le proxy gère l'authentification avec l'API key côté serveur
      const proxyUrl = process.env.NEXT_PUBLIC_XAI_VOICE_PROXY_URL || 'ws://localhost:3001/ws/xai-voice';
      
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] Connexion WebSocket via proxy', { 
        proxyUrl: proxyUrl.replace(/:\d+/, ':****'), // Masquer le port dans les logs
        hasToken: !!token // Token conservé pour compatibilité future mais non utilisé
      });
      
      this.ws = new WebSocket(proxyUrl);

      this.ws.onopen = () => {
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] ✅ WebSocket connecté');
        this.state = 'connected';
        this.reconnectManager.reset();
        this.sessionConfigured = false;
        this.lastActivity = Date.now();
        this.startIdleTimeout();
        this.callbacks.onConnected?.();
      };

      this.ws.onmessage = async (event) => {
        try {
          // Gérer les données binaires (Blob) et texte (string)
          let dataText: string;
          
          if (event.data instanceof Blob) {
            // Convertir Blob en texte (UTF-8)
            dataText = await event.data.text();
          } else if (typeof event.data === 'string') {
            dataText = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            // Convertir ArrayBuffer en texte
            dataText = new TextDecoder().decode(event.data);
          } else {
            // Fallback: convertir en string
            dataText = String(event.data);
          }

          const message = JSON.parse(dataText) as XAIVoiceMessage;
          handleXAIVoiceMessage(message, {
            callbacks: this.callbacks,
            updateLastActivity: () => {
              this.lastActivity = Date.now();
            },
            setInFlight: (value: boolean) => {
              this.inFlight = value;
            },
            getPendingDisconnect: () => this.pendingDisconnect,
            clearPendingDisconnect: () => {
              this.pendingDisconnect = null;
            },
            executePendingDisconnect: () => {
              if (this.pendingDisconnect) {
                const disconnectFn = this.pendingDisconnect;
                this.pendingDisconnect = null;
                disconnectFn();
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Ne pas logger comme erreur critique si c'est un problème de format de données
          // (pourrait être un message binaire non-JSON)
          logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur parsing message', {
            error: errorMessage,
            dataType: event.data instanceof Blob ? 'Blob' : event.data instanceof ArrayBuffer ? 'ArrayBuffer' : typeof event.data
          });
          // Ne pas déclencher onError pour les erreurs de parsing de format non-critiques
          // Le service continue à fonctionner même si un message ne peut pas être parsé
        }
      };

      this.ws.onerror = (error) => {
        // Les erreurs WebSocket dans le navigateur ne donnent pas beaucoup de détails
        // On log ce qu'on peut, mais on attend onclose pour plus d'infos
        logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur WebSocket détectée', {
          wsState: this.ws?.readyState,
          proxyUrl: proxyUrl.replace(/:\d+/, ':****')
        });
        // Ne pas changer l'état ici, onclose le fera avec plus de détails
      };

      this.ws.onclose = (event) => {
        const closeReason = event.reason || 'No reason provided';
        const closeCode = event.code;
        
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] WebSocket fermé', { 
          code: closeCode, 
          reason: closeReason,
          wasClean: event.wasClean,
          proxyUrl: proxyUrl.replace(/:\d+/, ':****')
        });
        
        this.state = 'disconnected';
        this.sessionConfigured = false;
        this.inFlight = false;
        this.pendingDisconnect = null;
        
        // Codes d'erreur WebSocket courants
        if (closeCode === 1006) {
          const errorMsg = 'Connexion WebSocket proxy fermée de manière anormale. Vérifiez que le proxy est démarré.';
          logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Connexion fermée anormalement (1006)', { 
            closeReason,
            proxyUrl: proxyUrl.replace(/:\d+/, ':****')
          });
          this.callbacks.onError?.(errorMsg);
        } else if (closeCode !== 1000) {
          const errorMsg = `Connexion WebSocket fermée (code: ${closeCode}, raison: ${closeReason})`;
          logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur de connexion', { code: closeCode, reason: closeReason });
          this.callbacks.onError?.(errorMsg);
        }
        
        this.callbacks.onDisconnected?.();

        // Tentative de reconnexion si ce n'est pas une fermeture volontaire
        this.reconnectManager.attemptReconnect(closeCode);
      };

    } catch (error) {
      this.state = 'error';
      logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur lors de la connexion', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, error instanceof Error ? error : undefined);
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Configurer la session
   */
  configureSession(config: XAIVoiceSessionConfig): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    // Format selon la documentation XAI Voice API
    const sessionConfig: Record<string, unknown> = {
      instructions: config.instructions || 'You are a helpful AI assistant.',
      voice: config.voice || 'Ara',
      turn_detection: config.turn_detection === null ? null : (config.turn_detection || {
        type: 'server_vad' // Utiliser VAD côté serveur pour détection automatique
      }),
      audio: config.audio || {
        input: {
          format: {
            type: config.input_audio_format || 'audio/pcm',
            rate: config.sample_rate || 24000
          }
        },
        output: {
          format: {
            type: config.output_audio_format || 'audio/pcm',
            rate: config.sample_rate || 24000
          }
        }
      }
    };

    // Ajouter les autres paramètres optionnels
    if (config.modalities) {
      sessionConfig['modalities'] = config.modalities;
    }
    if (config.input_audio_transcription) {
      sessionConfig['input_audio_transcription'] = config.input_audio_transcription;
    }
    if (config.output_audio_transcription) {
      sessionConfig['output_audio_transcription'] = config.output_audio_transcription;
    }
    if (config.max_response_output_tokens) {
      sessionConfig['max_response_output_tokens'] = config.max_response_output_tokens;
    }
    if (config.temperature !== undefined) {
      sessionConfig['temperature'] = config.temperature;
    }
    if (config.tools) {
      sessionConfig['tools'] = config.tools;
    }
    if (config.tool_choice) {
      sessionConfig['tool_choice'] = config.tool_choice;
    }

    const message: XAIVoiceMessage = {
      type: 'session.update',
      session: sessionConfig as unknown as XAIVoiceSessionConfig
    };

    this.ws.send(JSON.stringify(message));
    this.sessionConfigured = true;
    logger.info(LogCategory.AUDIO, '[XAIVoiceService] Session configurée', { voice: config.voice });
    
    // Déterminer le type de détection de tour
    if (config.turn_detection === null) {
      this.turnDetectionType = 'none';
    } else if (config.turn_detection?.type) {
      this.turnDetectionType = config.turn_detection.type;
    } else {
      this.turnDetectionType = 'server_vad';
    }
    
    this.responseModalities = config.modalities || ['text', 'audio'];
  }

  /**
   * Envoyer de l'audio (base64)
   */
  sendAudio(audioBase64: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    this.lastActivity = Date.now();

    if (!this.sessionConfigured) {
      logger.warn(LogCategory.AUDIO, '[XAIVoiceService] Session non configurée, configuration par défaut...');
      this.configureSession({});
    }

    const message: XAIVoiceMessage = {
      type: 'input_audio_buffer.append',
      audio: audioBase64
    };

    const messageStr = JSON.stringify(message);
    logger.info(LogCategory.AUDIO, '[XAIVoiceService] Envoi audio chunk', { 
      audioLength: audioBase64.length,
      messageLength: messageStr.length,
      wsReadyState: this.ws?.readyState
    });
    this.ws.send(messageStr);
  }

  /**
   * Finaliser l'envoi audio (indiquer la fin de l'input)
   */
  commitAudio(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    this.lastActivity = Date.now();
    this.inFlight = true; // Marquer comme "en cours de traitement"
    logger.info(LogCategory.AUDIO, '[XAIVoiceService] 🔵 CALL commitAudio - Début commit');

    // XAI API n'accepte que 'input_audio_buffer.commit' (pas 'conversation.item.commit')
    const message: XAIVoiceMessage = {
      type: 'input_audio_buffer.commit'
    };

    this.ws.send(JSON.stringify(message));
    logger.info(LogCategory.AUDIO, '[XAIVoiceService] ✅ Audio input finalisé (commit envoyé)', { commitType: 'input_audio_buffer.commit' });
    
    // Dans TOUS les cas, envoyer response.create pour forcer une réponse (debug + proof)
    this.createResponse();
    
    // Timeout de sécurité : si pas de réponse après 5s, autoriser la fermeture
    setTimeout(() => {
      if (this.inFlight) {
        logger.warn(LogCategory.AUDIO, '[XAIVoiceService] ⏱️ Timeout réponse (5s) - autoriser fermeture');
        this.inFlight = false;
        // Si un disconnect était en attente, l'exécuter
        if (this.pendingDisconnect) {
          const disconnectFn = this.pendingDisconnect;
          this.pendingDisconnect = null;
          disconnectFn();
        }
      }
    }, 5000);
  }

  /**
   * Envoyer un message texte (TEXT-ONLY smoke test)
   */
  sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    this.lastActivity = Date.now();

    if (!this.sessionConfigured) {
      logger.warn(LogCategory.AUDIO, '[XAIVoiceService] Session non configurée, configuration par défaut...');
      this.configureSession({});
    }

    // 1) Créer un item conversation avec input_text
    const createItemMessage: XAIVoiceMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(createItemMessage));
    logger.info(LogCategory.AUDIO, '[XAIVoiceService] conversation.item.create envoyé (TEXT)', { textLength: text.length });

    // 2) Demander une réponse
    this.createResponse();
  }

  /**
   * Demander explicitement une réponse (utile en client_vad / none)
   */
  createResponse(modalities: Array<'text' | 'audio'> = this.responseModalities): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    const message: XAIVoiceMessage = {
      type: 'response.create',
      response: {
        modalities
      }
    };

    this.ws.send(JSON.stringify(message));
    logger.info(LogCategory.AUDIO, '[XAIVoiceService] response.create envoyé', { modalities });
  }

  /**
   * Démarrer le timeout idle (auto-disconnect après 15s d'inactivité)
   */
  private startIdleTimeout(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    this.idleTimeout = setTimeout(() => {
      const idleTime = Date.now() - this.lastActivity;
      if (idleTime >= 15000) {
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] ⏱️ Auto-disconnect idle (15s)', { idleTime });
        this.disconnect();
      } else {
        // Reschedule
        this.startIdleTimeout();
      }
    }, 15000);
  }


  /**
   * Déconnecter (avec guard contre fermeture prématurée)
   */
  disconnect(): void {
    // Si en cours de traitement, repousser la fermeture
    if (this.inFlight) {
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] ⏸️ Disconnect demandé mais inFlight=true - reporté');
      this.pendingDisconnect = () => {
        this.disconnect();
      };
      return;
    }

    // Cleanup des timeouts
    this.reconnectManager.clearReconnectTimeout();

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    // Fermer la WebSocket
    if (this.ws) {
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] 🔌 Déconnexion WebSocket');
      this.ws.close(1000, 'Déconnexion volontaire');
      this.ws = null;
    }

    // Réinitialiser l'état
    this.state = 'disconnected';
    this.sessionConfigured = false;
    this.reconnectManager.reset();
    this.lastActivity = 0;
    this.inFlight = false;
    this.pendingDisconnect = null;
  }

  /**
   * Obtenir l'état de la connexion
   */
  getState(): XAIVoiceConnectionState {
    return this.state;
  }

  /**
   * Vérifier si connecté
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Instance singleton
 */
export const xaiVoiceService = new XAIVoiceService();

