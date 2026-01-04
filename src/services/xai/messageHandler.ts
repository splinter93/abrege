/**
 * Handler pour les messages XAI Voice
 * Extrait de xaiVoiceService.ts pour réduire la taille du fichier principal
 */

import { logger, LogCategory } from '@/utils/logger';
import type { XAIVoiceMessage, XAIVoiceAudioDeltaMessage, XAIVoiceCallbacks, XAIVoiceToolCall } from './types';

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

    case 'response.output_item.added':
      {
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] 🔔 Output item ajouté', {
          itemType: (message as { item?: { type?: string } }).item?.type
        });
        try {
          // XAI Voice format: message.item (pas message.response.output_item)
          const item = (message as { item?: { 
            type?: string; 
            call_id?: string;
            name?: string;
            arguments?: string;
          } }).item;
          
          logger.info(LogCategory.AUDIO, '[XAIVoiceService] 🔍 Analyse item', {
            hasItem: !!item,
            itemType: item?.type,
            callId: item?.call_id,
            name: item?.name,
            hasArguments: !!item?.arguments
          });
          
          // XAI Voice envoie type="function_call" au lieu de "tool_call"
          if (item?.type === 'function_call' && item.call_id && item.name) {
            logger.info(LogCategory.AUDIO, '[XAIVoiceService] 🎯 Function call détecté !', { 
              callId: item.call_id,
              name: item.name,
              arguments: item.arguments,
              argumentsLength: item.arguments?.length || 0
            });
            
            // Convertir au format XAIVoiceToolCall
            const toolCall: XAIVoiceToolCall = {
              id: item.call_id,
              type: 'function',
              function: {
                name: item.name,
                arguments: item.arguments || '{}'
              }
            };
            
            logger.info(LogCategory.AUDIO, '[XAIVoiceService] 🔧 Tool call formaté', {
              toolCall: JSON.stringify(toolCall, null, 2)
            });
            
            // Appeler le callback avec un tableau contenant le tool call
            options.callbacks.onToolCall?.([toolCall]);
          } else {
            logger.debug(LogCategory.AUDIO, '[XAIVoiceService] Output item sans function call', { 
              type: item?.type
            });
          }
        } catch (error) {
          logger.error(LogCategory.AUDIO, '[XAIVoiceService] ❌ Erreur parsing output_item', undefined, error instanceof Error ? error : new Error(String(error)));
        }
      }
      break;

    case 'response.function_call_arguments.delta':
      // Arguments en streaming - on les accumule
      logger.debug(LogCategory.AUDIO, '[XAIVoiceService] Function call arguments delta reçu', {
        delta: (message as { delta?: string }).delta
      });
      break;

    case 'response.function_call_arguments.done':
      {
        logger.info(LogCategory.AUDIO, '[XAIVoiceService] 🎯 Function call arguments COMPLETS !', {
          fullMessage: JSON.stringify(message, null, 2)
        });
        
        try {
          // XAI Voice envoie les détails complets ici
          const event = message as { 
            name?: string;
            call_id?: string;
            arguments?: string;
          };
          
          if (event.call_id && event.name && event.arguments) {
            logger.info(LogCategory.AUDIO, '[XAIVoiceService] 🚀 Exécution function call', {
              callId: event.call_id,
              name: event.name,
              arguments: event.arguments
            });
            
            // Convertir au format XAIVoiceToolCall
            const toolCall: XAIVoiceToolCall = {
              id: event.call_id,
              type: 'function',
              function: {
                name: event.name,
                arguments: event.arguments
              }
            };
            
            // Appeler le callback
            options.callbacks.onToolCall?.([toolCall]);
          } else {
            logger.warn(LogCategory.AUDIO, '[XAIVoiceService] Function call incomplet', {
              hasCallId: !!event.call_id,
              hasName: !!event.name,
              hasArguments: !!event.arguments
            });
          }
        } catch (error) {
          logger.error(LogCategory.AUDIO, '[XAIVoiceService] Erreur parsing function call', undefined, error instanceof Error ? error : new Error(String(error)));
        }
      }
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

