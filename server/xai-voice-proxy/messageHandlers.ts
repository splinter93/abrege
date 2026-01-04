/**
 * Handlers de messages WebSocket (client ↔ XAI)
 * Extrait de XAIVoiceProxyService.ts pour réduire la taille du fichier principal
 */

import WebSocket from 'ws';
import { logger, LogCategory } from '../../src/utils/logger';
import type { ConnectionManager } from './connectionManager';
import type { XAIVoiceProxyConfig } from './types';
import { getRawDataLength } from './connectionTypes';
import { normalizeClientMessage } from './messageNormalizer';
import { dumpFirstAudioChunk } from './wavDump';

/**
 * Options pour les message handlers
 */
export interface MessageHandlerOptions {
  connectionManager: ConnectionManager;
  config: XAIVoiceProxyConfig;
}

/**
 * Convertir WebSocket.RawData en string
 */
function rawDataToString(data: WebSocket.RawData): string {
  if (typeof data === 'string') {
    return data;
  }
  if (data instanceof Buffer) {
    return data.toString('utf8');
  }
  return Buffer.from(data as ArrayBuffer).toString('utf8');
}

/**
 * Gère un message du client vers XAI
 */
export function handleClientMessage(
  connectionId: string,
  data: WebSocket.RawData,
  options: MessageHandlerOptions
): void {
  const connection = options.connectionManager.get(connectionId);
  if (!connection) {
    logger.warn(LogCategory.AUDIO, '[XAIVoiceProxyService] Message reçu mais connexion introuvable', {
      connectionId
    });
    return;
  }

  connection.metadata.lastActivity = Date.now();
  
  const DEBUG_RAW = process.env.DEBUG_XAI_RAW === '1';
  const dataStr = rawDataToString(data);
  const dataSize = data instanceof Buffer ? data.length : dataStr.length;
  let outboundStr = dataStr;
  
  try {
    const parsed = JSON.parse(dataStr) as Record<string, unknown>;
    const normalizedType = typeof parsed.type === 'string'
      ? parsed.type.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
      : parsed.type;
    const messageType = typeof normalizedType === 'string' ? normalizedType : (normalizedType || 'unknown');

    // Normalisation des messages
    const normalized = normalizeClientMessage(parsed);
    if (normalized.mutations.length > 0) {
      outboundStr = JSON.stringify(normalized.normalized);
    }

    // Dump WAV pour audio (1er chunk seulement)
    if (messageType === 'input_audio_buffer.append' && parsed.audio && typeof parsed.audio === 'string') {
      connection.audioChunkCount = (connection.audioChunkCount || 0) + 1;
      if (connection.audioChunkCount === 1) {
        dumpFirstAudioChunk(connectionId, parsed.audio);
      }
    }

    // Log systématique: type + taille + keys principales
    const logData: Record<string, unknown> = {
      connectionId,
      type: messageType,
      size: dataSize,
      xaiReady: connection.xaiWs?.readyState === WebSocket.OPEN
    };

    if (normalized.mutations.length) {
      logData.proxyMutations = normalized.mutations;
    }

    // Keys principales selon le type
    if (parsed.session) {
      const session = parsed.session as Record<string, unknown>;
      logData.sessionKeys = Object.keys(session);
      logData.hasModalities = !!session.modalities;
      logData.modalities = session.modalities;
    }
    if (parsed.audio) {
      logData.audioLength = typeof parsed.audio === 'string' ? parsed.audio.length : 'unknown';
      logData.hasAudio = true;
    }
    if (parsed.item) {
      const item = parsed.item as Record<string, unknown>;
      logData.itemKeys = Object.keys(item);
      logData.itemType = item.type;
    }
    if (parsed.response) {
      const response = parsed.response as Record<string, unknown>;
      logData.responseKeys = Object.keys(response);
      logData.responseModalities = response.modalities;
    }

    // Log JSON complet si DEBUG_RAW (sans audio base64 pour éviter spam)
    if (DEBUG_RAW) {
      const loggableParsed = { ...parsed };
      if (loggableParsed.audio && typeof loggableParsed.audio === 'string') {
        loggableParsed.audio = `[BASE64_${loggableParsed.audio.length}_chars]`;
      }
      logData.rawJSON = JSON.stringify(loggableParsed, null, 2).substring(0, 2000);
    }

    // Helpful when debugging mappings: show what we actually sent.
    if (normalized.mutations.length) {
      try {
        const effective = JSON.parse(outboundStr);
        logData.effectiveType = (effective as Record<string, unknown>)?.type;
      } catch {
        // ignore
      }
    }

    logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] 📤 Message client → XAI', logData);

  } catch {
    logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Message client → XAI (non-JSON)', {
      connectionId,
      size: dataSize,
      xaiReady: connection.xaiWs?.readyState === WebSocket.OPEN
    });
  }

  // Final ultra-defensive fixups (works even if JSON parsing / normalization above failed)
  // Some clients still emit `conversation.item.commit` on teardown/end-of-turn; XAI expects `input_audio_buffer.commit`.
  if (typeof outboundStr === 'string' && outboundStr.includes('conversation.item.commit')) {
    outboundStr = outboundStr.replace(/conversation\.item\.commit/g, 'input_audio_buffer.commit');
  }
  
  // IMPORTANT: XAI attend des frames TEXT (JSON). Envoyer un Buffer = frame binaire, souvent ignorée.
  if (connection.xaiWs && connection.xaiWs.readyState === WebSocket.OPEN) {
    connection.xaiWs.send(outboundStr);
  } else {
    // Sinon, mettre en queue pour envoi une fois la connexion établie
    logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Message mis en queue (XAI non prêt)', {
      connectionId,
      queueLength: connection.messageQueue.length,
      xaiState: connection.xaiWs?.readyState
    });
    connection.messageQueue.push(outboundStr);
  }
}

/**
 * Gère un message de XAI vers le client
 */
export function handleXAIMessage(
  connectionId: string,
  data: WebSocket.RawData,
  options: MessageHandlerOptions
): void {
  const connection = options.connectionManager.get(connectionId);
  if (!connection) {
    return;
  }

  if (connection.clientWs.readyState === WebSocket.OPEN) {
    connection.metadata.lastActivity = Date.now();
    
    const DEBUG_RAW = process.env.DEBUG_XAI_RAW === '1';
    const dataStr = rawDataToString(data);
    const dataSize = data instanceof Buffer ? data.length : dataStr.length;
    
    try {
      const parsed = JSON.parse(dataStr) as Record<string, unknown>;
      const messageType = parsed.type || 'unknown';
      
      // Log systématique: type + taille + keys principales
      const logData: Record<string, unknown> = {
        connectionId,
        type: messageType,
        size: dataSize
      };
      
      // Keys principales selon le type
      if (parsed.error) {
        const error = parsed.error as Record<string, unknown>;
        logData.error = error;
        logData.errorType = error.type;
        logData.errorMessage = error.message;
        logData.errorCode = error.code;
      }
      if (parsed.delta) {
        logData.hasDelta = true;
        logData.deltaLength = typeof parsed.delta === 'string' ? parsed.delta.length : 'unknown';
        logData.deltaType = typeof parsed.delta;
      }
      if (parsed.session) {
        logData.sessionKeys = Object.keys(parsed.session as Record<string, unknown>);
      }
      if (parsed.conversation) {
        logData.conversationKeys = Object.keys(parsed.conversation as Record<string, unknown>);
      }
      
      // Log JSON complet si DEBUG_RAW (sans delta pour éviter spam)
      if (DEBUG_RAW) {
        const loggableParsed = { ...parsed };
        if (loggableParsed.delta && typeof loggableParsed.delta === 'string') {
          loggableParsed.delta = `[DELTA_${loggableParsed.delta.length}_chars]`;
        }
        logData.rawJSON = JSON.stringify(loggableParsed, null, 2).substring(0, 2000);
      }
      
      if (messageType === 'error') {
        logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] ❌ Message XAI → client (ERROR)', logData);
      } else {
        logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] 📥 Message XAI → client', logData);
      }
    } catch {
      logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Message XAI → client (non-JSON)', {
        connectionId,
        size: dataSize
      });
    }
    
    connection.clientWs.send(dataStr);
  }
}

