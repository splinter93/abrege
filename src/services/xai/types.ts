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
  | 'conversation.item.create'
  | 'input_audio_buffer.speech_started'
  | 'input_audio_buffer.speech_stopped'
  | 'conversation.created'
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
  | 'response.function_call_arguments.delta'
  | 'response.function_call_arguments.done'
  | 'response.output_item.done'
  | 'response.content_part.added'
  | 'response.content_part.done'
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
  tool_result?: XAIVoiceToolResult[];
}

/**
 * Structure pour response.output_item (tool calls)
 */
export interface XAIVoiceOutputItem {
  type: 'tool_call';
  tool_calls?: XAIVoiceToolCall[];
  [key: string]: unknown;
}

/**
 * Message XAI Voice
 */
export interface XAIVoiceMessage {
  type: XAIVoiceMessageType;
  session?: XAIVoiceSessionConfig;
  item?: {
    type?: string;
    call_id?: string;
    output?: string;
    [key: string]: unknown;
  };
  response?: {
    output_item?: XAIVoiceOutputItem;
    [key: string]: unknown;
  } | unknown;
  event_id?: string;
  audio?: string; // Base64 encoded audio
  transcript?: string;
  item_id?: string;
  delta?: string;
  name?: string; // Pour function calls
  call_id?: string; // Pour function calls
  arguments?: string; // Pour function calls
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
 * Tool Call reçu de l'API XAI Voice (format standard)
 */
export interface XAIVoiceToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Tool Result à envoyer à l'API XAI Voice
 */
export interface XAIVoiceToolResult {
  tool_call_id: string;
  name: string;
  content: string; // JSON string ou string simple
  error?: string; // Optionnel, pour les erreurs
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
  onToolCall?: (toolCalls: XAIVoiceToolCall[]) => void; // Callback pour tool calls détectés
}

/**
 * État de la connexion
 */
export type XAIVoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

