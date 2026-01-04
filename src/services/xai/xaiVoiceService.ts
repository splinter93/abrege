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

/**
 * Types de messages XAI Voice API
 */
export type XAIVoiceMessageType =
  | 'session.update'
  | 'session.updated'
  | 'input_audio_buffer.append'
  | 'input_audio_buffer.commit'
  | 'input_audio_buffer.committed'
  | 'input_audio_buffer.speech_started'
  | 'input_audio_buffer.speech_stopped'
  | 'conversation.created'
  | 'conversation.item.create'
  | 'conversation.item.added'
  | 'conversation.item.input_audio_transcription.completed'
  | 'response.create'
  | 'response.created'
  | 'response.output_item.added'
  | 'response.output_audio_transcript.delta'
  | 'response.output_audio_transcript.done'
  | 'response.output_audio.delta'
  | 'response.output_audio.done'
  | 'response.done'
  | 'error';

/**
 * Configuration de session XAI Voice
 */
export interface XAIVoiceSessionConfig {
  instructions?: string;
  voice?: 'Ara' | 'Rex' | 'Sal' | 'Eve' | 'Leo';
  input_audio_format?: 'audio/pcm' | 'audio/pcmu' | 'audio/pcma' | 'audio/opus';
  input_audio_transcription?: {
    model: string;
  };
  output_audio_format?: 'audio/pcm' | 'audio/pcmu' | 'audio/pcma' | 'audio/opus';
  output_audio_transcription?: {
    model: string;
  };
  sample_rate?: 16000 | 24000 | 48000;
  temperature?: number;
  max_response_output_tokens?: number;
  modalities?: Array<'text' | 'audio'>;
  tools?: Array<unknown>;
  tool_choice?: 'auto' | 'none' | 'required';
  tool_result?: unknown;
}

/**
 * Message XAI Voice
 */
export interface XAIVoiceMessage {
  type: XAIVoiceMessageType;
  session?: XAIVoiceSessionConfig;
  audio?: string; // Base64 encoded audio
  transcript?: string;
  item_id?: string;
  delta?: string;
  error?: {
    type: string;
    message: string;
  };
}

/**
 * Callbacks pour les événements
 */
export interface XAIVoiceCallbacks {
  onAudioDelta?: (audio: string) => void; // Base64 audio chunk
  onAudioDone?: () => void;
  onTranscriptDelta?: (text: string) => void;
  onTranscriptDone?: (text: string) => void;
  onError?: (error: Error | string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

/**
 * État de la connexion
 */
export type XAIVoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Service XAI Voice
 */
export class XAIVoiceService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private callbacks: XAIVoiceCallbacks = {};
  private state: XAIVoiceConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private sessionConfigured = false;

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
      // Créer la connexion WebSocket
      // Note: Les WebSockets browser ne supportent pas les headers HTTP custom
      // XAI Voice API utilise le token dans l'URL selon la doc: wss://api.x.ai/v1/realtime?token=<ephemeral_token>
      if (!token) {
        throw new Error('Token éphémère manquant');
      }
      
      // Vérifier le format du token
      const tokenPrefix = token.substring(0, Math.min(30, token.length));
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] Connexion WebSocket', { 
        tokenLength: token.length,
        tokenPrefix: tokenPrefix,
        tokenStartsWithXAI: token.startsWith('xai-')
      });
      
      const wsUrl = `wss://api.x.ai/v1/realtime?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] ✅ WebSocket connecté');
        this.state = 'connected';
        this.reconnectAttempts = 0;
        this.sessionConfigured = false;
        this.callbacks.onConnected?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as XAIVoiceMessage;
          this.handleMessage(message);
        } catch (error) {
          logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur parsing message', {
            error: error instanceof Error ? error.message : String(error)
          });
          this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      };

      this.ws.onerror = (error) => {
        // Les erreurs WebSocket dans le navigateur ne donnent pas beaucoup de détails
        // On log ce qu'on peut, mais on attend onclose pour plus d'infos
        logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur WebSocket détectée', {
          wsState: this.ws?.readyState,
          url: wsUrl.replace(token, '***')
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
          url: wsUrl.replace(token, '***')
        });
        
        this.state = 'disconnected';
        this.sessionConfigured = false;
        
        // Codes d'erreur WebSocket courants
        if (closeCode === 1006) {
          const errorMsg = 'Connexion WebSocket refusée par le serveur XAI (1006). Cela peut indiquer que le token éphémère n\'est pas accepté via query parameter, ou que l\'API nécessite une authentification différente.';
          logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Connexion fermée anormalement (1006)', { 
            closeReason,
            tokenPrefix: this.token?.substring(0, 30),
            suggestion: 'L\'API XAI pourrait nécessiter un proxy WebSocket côté serveur pour l\'authentification'
          });
          this.callbacks.onError?.(errorMsg);
        } else if (closeCode !== 1000) {
          const errorMsg = `Connexion WebSocket fermée (code: ${closeCode}, raison: ${closeReason})`;
          logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur de connexion', { code: closeCode, reason: closeReason });
          this.callbacks.onError?.(errorMsg);
        }
        
        this.callbacks.onDisconnected?.();

        // Tentative de reconnexion si ce n'est pas une fermeture volontaire
        if (closeCode !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          logger.info(LogCategory.AUDIO, `[XAIVoiceService] Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms`);
          
          this.reconnectTimeout = setTimeout(() => {
            if (this.token) {
              this.connect(this.token, this.callbacks).catch((err) => {
                logger.error(LogCategory.AUDIO, '[XAIVoiceService] Erreur reconnexion', undefined, err instanceof Error ? err : new Error(String(err)));
              });
            }
          }, delay);
        }
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
      turn_detection: {
        type: 'server_vad' // Utiliser VAD côté serveur pour détection automatique
      },
      audio: {
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
    if (config.input_audio_transcription) {
      sessionConfig['input_audio_transcription'] = config.input_audio_transcription;
    }
    if (config.output_audio_transcription) {
      sessionConfig['output_audio_transcription'] = config.output_audio_transcription;
    }
    if (config.max_response_output_tokens) {
      sessionConfig['max_response_output_tokens'] = config.max_response_output_tokens;
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
  }

  /**
   * Envoyer de l'audio (base64)
   */
  sendAudio(audioBase64: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    if (!this.sessionConfigured) {
      logger.warn(LogCategory.AUDIO, '[XAIVoiceService] Session non configurée, configuration par défaut...');
      this.configureSession({});
    }

    const message: XAIVoiceMessage = {
      type: 'input_audio_buffer.append',
      audio: audioBase64
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Finaliser l'envoi audio (indiquer la fin de l'input)
   */
  commitAudio(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket non connecté');
    }

    const message: XAIVoiceMessage = {
      type: 'input_audio_buffer.commit'
    };

    this.ws.send(JSON.stringify(message));
    logger.info(LogCategory.AUDIO, '[XAIVoiceService] Audio input finalisé');
  }

  /**
   * Gérer les messages reçus
   */
  private handleMessage(message: XAIVoiceMessage): void {
    switch (message.type) {
      case 'session.updated':
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] Session mise à jour');
        break;

      case 'conversation.created':
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] Conversation créée');
        break;

      case 'input_audio_buffer.speech_started':
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] Parole détectée');
        break;

      case 'input_audio_buffer.speech_stopped':
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] Parole terminée');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (message.transcript) {
          this.callbacks.onTranscriptDone?.(message.transcript);
        }
        break;

      case 'response.output_audio_transcript.delta':
        if (message.delta) {
          this.callbacks.onTranscriptDelta?.(message.delta);
        }
        break;

      case 'response.output_audio_transcript.done':
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] Transcription terminée');
        break;

      case 'response.output_audio.delta':
        if ((message as any).delta) {
          this.callbacks.onAudioDelta?.((message as any).delta);
        }
        break;

      case 'response.output_audio.done':
        this.callbacks.onAudioDone?.();
        break;

      case 'response.done':
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] Réponse terminée');
        break;

      case 'error':
        const errorMsg = message.error?.message || 'Erreur inconnue';
        logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur serveur', { error: message.error });
        this.callbacks.onError?.(errorMsg);
        break;

      default:
        logger.debug(LogCategory.AUDIO, '[XAIVoiceService] Message non géré', { type: message.type });
    }
  }

  /**
   * Déconnecter
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Déconnexion volontaire');
      this.ws = null;
    }

    this.state = 'disconnected';
    this.sessionConfigured = false;
    this.reconnectAttempts = 0;
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

