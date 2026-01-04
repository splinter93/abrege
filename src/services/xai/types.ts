/**
 * Types pour XAI Voice Service
 * Extrait de xaiVoiceService.ts pour réduire la taille du fichier principal
 */

/**
 * Types de messages XAI Voice API
 */
export type XAIVoiceMessageType =
  | 'session.update'
  | 'session.updated'
  | 'input_audio_buffer.append'
  | 'input_audio_buffer.commit'
  | 'input_audio_buffer.committed'
  | 'conversation.item.commit'
  | 'conversation.item.committed'
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
  | 'error'
  | 'ping';

/**
 * Type de tool prédéfini XAI Voice
 */
export type XAIVoicePredefinedToolType = 'file_search' | 'web_search' | 'x_search';

/**
 * Tool prédéfini XAI Voice (file_search, web_search, x_search)
 */
export interface XAIVoicePredefinedTool {
  type: XAIVoicePredefinedToolType;
}

/**
 * Tool function XAI Voice (format aplati)
 */
export interface XAIVoiceFunctionTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      [key: string]: unknown;
    }>;
    required?: string[];
  };
}

/**
 * Union type pour tous les tools XAI Voice
 */
export type XAIVoiceTool = XAIVoicePredefinedTool | XAIVoiceFunctionTool;

/**
 * Configuration de session XAI Voice
 */
export interface XAIVoiceSessionConfig {
  instructions?: string;
  voice?: 'Ara' | 'Rex' | 'Sal' | 'Eve' | 'Leo';
  turn_detection?: {
    type: 'server_vad' | 'client_vad';
  } | null; // null = push-to-talk / no VAD
  audio?: {
    input?: {
      format?: {
        type?: 'audio/pcm' | 'audio/pcmu' | 'audio/pcma' | 'audio/opus';
        rate?: 8000 | 16000 | 21050 | 24000 | 32000 | 44100 | 48000;
      };
    };
    output?: {
      format?: {
        type?: 'audio/pcm' | 'audio/pcmu' | 'audio/pcma' | 'audio/opus';
        rate?: 8000 | 16000 | 21050 | 24000 | 32000 | 44100 | 48000;
      };
    };
  };
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
  tools?: XAIVoiceTool[];
  tool_choice?: 'auto' | 'none' | 'required';
  tool_result?: unknown;
}

/**
 * Message XAI Voice
 */
export interface XAIVoiceMessage {
  type: XAIVoiceMessageType;
  session?: XAIVoiceSessionConfig;
  item?: unknown;
  response?: unknown;
  event_id?: string;
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
 * Message spécialisé pour les audio delta (API XAI non typée complètement)
 */
export interface XAIVoiceAudioDeltaMessage extends XAIVoiceMessage {
  type: 'response.output_audio.delta';
  delta: string; // Base64 audio chunk
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

