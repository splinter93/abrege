/**
 * StreamParser - Parse SSE (Server-Sent Events) chunks
 * 
 * Responsabilité unique : Parser les chunks SSE et gérer le buffer
 * 
 * @module services/streaming/StreamParser
 */

import { simpleLogger as logger } from '@/utils/logger';

/**
 * Chunk SSE parsé
 */
export interface StreamChunk {
  type: 'start' | 'delta' | 'tool_execution' | 'tool_result' | 'assistant_round_complete' | 'done' | 'error';
  content?: string;
  reasoning?: string;
  tool_calls?: Array<{
    id: string;
    type?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
  toolCount?: number;
  toolName?: string;
  toolCallId?: string;
  result?: unknown;
  success?: boolean;
  finishReason?: string;
  // ✅ Champs pour les erreurs enrichies
  error?: string;
  errorCode?: string; // Code d'erreur spécifique (ex: "tool_use_failed")
  provider?: string; // Provider qui a émis l'erreur
  model?: string; // Modèle utilisé (legacy, pour erreurs)
  statusCode?: number; // HTTP status code
  roundCount?: number; // Round où l'erreur s'est produite
  recoverable?: boolean; // Si l'erreur peut être récupérée avec retry
  timestamp?: number; // Timestamp de l'erreur
  // ✅ NOUVEAU : Info modèle pour debug (dans chunk 'start')
  modelInfo?: {
    original: string;
    current: string;
    wasOverridden: boolean;
    reasons: string[];
  };
}

/**
 * Service pour parser les chunks SSE et gérer le buffer
 */
export class StreamParser {
  private buffer: string = '';
  private readonly decoder: TextDecoder;

  constructor() {
    this.decoder = new TextDecoder();
  }

  /**
   * Parse un chunk de données brutes SSE
   * @param value - Uint8Array du chunk
   * @returns Array de chunks parsés (peut être vide si chunk incomplet)
   */
  parseChunk(value: Uint8Array): StreamChunk[] {
    // Décoder et accumuler dans le buffer
    this.buffer += this.decoder.decode(value, { stream: true });
    
    // Split par lignes
    const lines = this.buffer.split('\n');
    
    // Garder la dernière ligne (potentiellement incomplète) dans le buffer
    this.buffer = lines.pop() || '';

    const chunks: StreamChunk[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Ignorer lignes vides ou sans data:
      if (!trimmed || !trimmed.startsWith('data: ')) {
        continue;
      }

      // Extraire le JSON après "data: "
      const data = trimmed.slice(6);
      
      // Parser le JSON
      const chunk = this.parseJSON(data);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  /**
   * Parse une ligne JSON
   * @param data - String JSON à parser
   * @returns Chunk parsé ou null si erreur
   */
  private parseJSON(data: string): StreamChunk | null {
    try {
      return JSON.parse(data) as StreamChunk;
    } catch (parseError) {
      logger.warn('[StreamParser] ⚠️ Erreur parsing chunk:', parseError);
      return null;
    }
  }

  /**
   * Réinitialise le buffer
   */
  reset(): void {
    this.buffer = '';
  }

  /**
   * Retourne l'état du buffer (pour debug)
   */
  getBufferState(): { hasData: boolean; length: number } {
    return {
      hasData: this.buffer.length > 0,
      length: this.buffer.length
    };
  }
}

