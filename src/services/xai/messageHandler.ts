/**
 * Handler pour les messages XAI Voice
 * Extrait de xaiVoiceService.ts pour réduire la taille du fichier principal
 */

import { logger, LogCategory } from '@/utils/logger';
import type { XAIVoiceMessage, XAIVoiceAudioDeltaMessage, XAIVoiceCallbacks } from './types';

/**
 * Options pour le message handler
 */
export interface MessageHandlerOptions {
  callbacks: XAIVoiceCallbacks;
  updateLastActivity: () => void;
  setInFlight: (value: boolean) => void;
  getPendingDisconnect: () => (() => void) | null;
  clearPendingDisconnect: () => void;
  executePendingDisconnect: () => void;
}

/**
 * Gérer un message reçu
 */
export function handleXAIVoiceMessage(
  message: XAIVoiceMessage,
  options: MessageHandlerOptions
): void {
  options.updateLastActivity();
  logger.info(LogCategory.AUDIO, '[XAIVoiceService] Message reçu', { type: message.type });

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
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] Transcription input complétée', { transcript: message.transcript });
      if (message.transcript) {
        options.callbacks.onTranscriptDone?.(message.transcript);
      }
      break;

    case 'response.output_audio_transcript.delta':
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] Transcription delta reçue', { deltaLength: message.delta?.length });
      if (message.delta) {
        options.callbacks.onTranscriptDelta?.(message.delta);
      }
      break;

    case 'response.output_audio_transcript.done':
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] Transcription terminée');
      break;

    case 'response.output_audio.delta':
      {
        const audioDeltaMessage = message as XAIVoiceAudioDeltaMessage;
        const audioDelta = audioDeltaMessage.delta;
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] Audio delta reçu', {
          deltaLength: audioDelta?.length,
          hasCallback: !!options.callbacks.onAudioDelta
        });
        if (audioDelta) {
          options.callbacks.onAudioDelta?.(audioDelta);
        }
      }
      break;

    case 'response.output_audio.done':
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] ✅ Audio output terminé (response.output_audio.done)');
      options.callbacks.onAudioDone?.();
      // Ne pas mettre inFlight = false ici, on attend response.done
      break;

    case 'response.done':
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] ✅ Réponse terminée (response.done)');
      options.setInFlight(false); // Plus en cours de traitement
      // Si un disconnect était en attente, l'exécuter maintenant
      if (options.getPendingDisconnect()) {
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] Exécution disconnect en attente après response.done');
        options.executePendingDisconnect();
      }
      break;

    case 'error':
      {
        const errorMsg = message.error?.message || 'Erreur inconnue';
        logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur serveur', { error: message.error });
        options.callbacks.onError?.(errorMsg);
      }
      break;

    case 'ping':
      logger.info(LogCategory.AUDIO, '[XAIVoiceService] Message ping reçu');
      // Messages ping - ignorer silencieusement (utilisés pour keep-alive)
      break;

    default:
      logger.debug(LogCategory.AUDIO, '[XAIVoiceService] Message non géré', { type: message.type });
  }
}

