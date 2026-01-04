/**
 * Types et helpers pour les connexions proxy
 * Extrait de XAIVoiceProxyService.ts pour réduire la taille du fichier principal
 */

import WebSocket from 'ws';
import type { ProxyConnectionMetadata } from './types';

/**
 * Taille maximale de la queue de messages
 */
export const MAX_QUEUE_SIZE = 50;

/**
 * Connexion proxy active
 */
export interface ActiveConnection {
  clientWs: WebSocket;
  xaiWs: WebSocket | null;
  metadata: ProxyConnectionMetadata;
  pingInterval?: NodeJS.Timeout;
  heartbeatTimeout?: NodeJS.Timeout;
  messageQueue: string[]; // Queue (text frames) pour les messages reçus avant connexion XAI
  audioChunkCount?: number; // Compteur pour dump WAV (1 chunk sur N)
}

/**
 * Helper pour calculer la longueur de WebSocket.RawData
 * Note: Type assertion utilisée car TypeScript a du mal avec l'union type complexe de ws
 */
export function getRawDataLength(data: WebSocket.RawData): number | string {
  // Type assertion nécessaire car TypeScript ne peut pas bien inférer le type union
  const dataTyped = data as string | Buffer | ArrayBuffer | Buffer[];
  if (typeof dataTyped === 'string') {
    return dataTyped.length;
  }
  if (Buffer.isBuffer(dataTyped)) {
    return dataTyped.length;
  }
  if (dataTyped instanceof ArrayBuffer) {
    return dataTyped.byteLength;
  }
  if (Array.isArray(dataTyped)) {
    return dataTyped.reduce((acc: number, buf: Buffer) => {
      return acc + (Buffer.isBuffer(buf) ? buf.length : 0);
    }, 0);
  }
  return 'unknown';
}

