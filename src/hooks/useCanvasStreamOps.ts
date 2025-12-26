/**
 * useCanvasStreamOps - Hook pour l'édition streaming du canvas
 * 
 * Gère :
 * - Envoi d'opérations (POST ops:stream)
 * - Écoute des ACK/CONFLICT (SSE ops:listen)
 * - Synchronisation de l'état local
 * - Gestion des conflits
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { logger, LogCategory } from '@/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface StreamOperation {
  op_id: string;
  client_version: string;
  timestamp: number;
  
  // ContentOperation fields
  id: string;
  action: 'insert' | 'replace' | 'delete' | 'upsert_section';
  target: {
    type: 'heading' | 'regex' | 'position' | 'anchor';
    heading?: {
      path?: string[];
      level?: number;
      heading_id?: string;
    };
    regex?: {
      pattern: string;
      flags?: string;
      nth?: number;
    };
    position?: {
      mode: 'offset' | 'start' | 'end';
      offset?: number;
    };
    anchor?: {
      name: 'doc_start' | 'doc_end' | 'after_toc' | 'before_first_heading';
    };
  };
  where: 'before' | 'after' | 'inside_start' | 'inside_end' | 'at' | 'replace_match';
  content?: string;
  options?: {
    ensure_heading?: boolean;
    surround_with_blank_lines?: number;
    dedent?: boolean;
  };
}

export interface OpResult {
  op_id: string;
  status: 'ack' | 'conflict' | 'error';
  server_version?: string;
  error?: string;
  reason?: string;
  expected_version?: string;
}

interface CanvasStreamEvent {
  event: 'ack' | 'conflict' | 'error';
  op_id: string;
  status?: string;
  server_version?: string;
  reason?: string;
  expected_version?: string;
  error?: string;
}

interface UseCanvasStreamOpsOptions {
  enabled?: boolean;
  onAck?: (result: OpResult) => void;
  onConflict?: (result: OpResult) => void;
  onError?: (error: Error) => void;
  debug?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCanvasStreamOps(
  canvasRef: string | null, // UUID ou slug de la note
  options: UseCanvasStreamOpsOptions = {}
) {
  const {
    enabled = true,
    onAck,
    onConflict,
    onError,
    debug = false
  } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastServerVersion, setLastServerVersion] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  
  // ✅ FIX: Stocker les callbacks dans des refs pour éviter les re-renders
  const onAckRef = useRef(onAck);
  const onConflictRef = useRef(onConflict);
  const onErrorRef = useRef(onError);
  
  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onAckRef.current = onAck;
    onConflictRef.current = onConflict;
    onErrorRef.current = onError;
  }, [onAck, onConflict, onError]);

  /**
   * Récupérer le token JWT
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const supabaseAuth = localStorage.getItem('sb-localhost-auth-token');
      if (supabaseAuth) {
        const parsed = JSON.parse(supabaseAuth);
        if (parsed.access_token) {
          return parsed.access_token;
        }
      }
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      for (const key of keys) {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.access_token) {
          return data.access_token;
        }
      }
    } catch (e) {
      logger.error(LogCategory.EDITOR, '[useCanvasStreamOps] Failed to get auth token', e);
    }
    return null;
  }, []);

  /**
   * Envoyer une opération
   * 
   * ⚠️ IMPORTANT : Cette fonction envoie l'op et retourne immédiatement.
   * Le résultat métier (ACK/CONFLICT) arrive via SSE (onAck/onConflict callbacks).
   * La réponse HTTP est un simple accusé technique (202 Accepted).
   */
  const sendOp = useCallback(async (op: StreamOperation): Promise<void> => {
    if (!canvasRef) {
      throw new Error('canvasRef is null');
    }

    const token = await getAuthToken();
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await fetch(`/api/v2/canvas/${canvasRef}/ops:stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ops: [op]
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorBody.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (debug) {
      logger.debug(LogCategory.EDITOR, '[useCanvasStreamOps] Op sent (202 Accepted)', {
        op_id: op.op_id,
        accepted: data.accepted,
        ops_count: data.ops_count
      });
    }

    // Note : Le résultat métier (ACK/CONFLICT) arrivera via SSE
  }, [canvasRef, getAuthToken, debug]);

  /**
   * Envoyer un batch d'opérations
   * 
   * ⚠️ IMPORTANT : Retourne immédiatement après envoi (202 Accepted).
   * Les résultats métier arrivent via SSE.
   */
  const sendBatch = useCallback(async (ops: StreamOperation[]): Promise<void> => {
    if (!canvasRef) {
      throw new Error('canvasRef is null');
    }

    if (ops.length === 0 || ops.length > 3) {
      throw new Error('Batch size must be 1-3 operations');
    }

    const token = await getAuthToken();
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await fetch(`/api/v2/canvas/${canvasRef}/ops:stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ops
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorBody.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (debug) {
      logger.debug(LogCategory.EDITOR, '[useCanvasStreamOps] Batch sent (202 Accepted)', {
        opsCount: ops.length,
        accepted: data.accepted
      });
    }

    // Note : Les résultats métier arriveront via SSE
  }, [canvasRef, getAuthToken, debug]);

  /**
   * Écouter les événements SSE
   */
  useEffect(() => {
    if (!canvasRef || !enabled) {
      if (debug) {
        logger.debug(LogCategory.EDITOR, '[useCanvasStreamOps] Skipped', {
          canvasRef,
          enabled
        });
      }
      // Cleanup si désactivé
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // ✅ FIX: Éviter de recréer la connexion si elle est déjà ouverte
    // EventSource.OPEN = 1 (valeur numérique pour éviter les problèmes SSR)
    if (eventSourceRef.current && eventSourceRef.current.readyState === 1) {
      if (debug) {
        logger.debug(LogCategory.EDITOR, '[useCanvasStreamOps] Connection already open, skipping', {
          canvasRef
        });
      }
      return;
    }

    // Cleanup de la connexion précédente (si fermée ou en erreur)
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (debug) {
      logger.debug(LogCategory.EDITOR, '[useCanvasStreamOps] Connecting...', {
        canvasRef
      });
    }

    const initializeConnection = async () => {
      const token = await getAuthToken();
      if (!token) {
        logger.warn(LogCategory.EDITOR, '[useCanvasStreamOps] No auth token found', { canvasRef });
        return null;
      }

      const eventSource = new EventSource(
        `/api/v2/canvas/${canvasRef}/ops:listen?token=${token}`
      );
      return eventSource;
    };

    initializeConnection().then(eventSource => {
      if (!eventSource) return;

      eventSourceRef.current = eventSource;

      /**
       * Handler pour les messages génériques
       */
      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data: CanvasStreamEvent = JSON.parse(event.data);

          if (debug) {
            logger.debug(LogCategory.EDITOR, '[useCanvasStreamOps] Event received', {
              canvasRef,
              event: data.event,
              op_id: data.op_id
            });
          }

          // Dispatcher selon le type d'événement
          switch (data.event) {
            case 'ack':
              if (data.server_version) {
                setLastServerVersion(data.server_version);
              }
              onAckRef.current?.({
                op_id: data.op_id,
                status: 'ack',
                server_version: data.server_version
              });
              break;

            case 'conflict':
              onConflictRef.current?.({
                op_id: data.op_id,
                status: 'conflict',
                reason: data.reason,
                expected_version: data.expected_version
              });
              break;

            case 'error':
              onErrorRef.current?.(new Error(data.error || 'Unknown error'));
              break;
          }
        } catch (parseError) {
          logger.error(LogCategory.EDITOR, '[useCanvasStreamOps] Failed to parse event', {
            canvasRef,
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            rawData: event.data
          });
        }
      };

      /**
       * Handler pour les erreurs de connexion
       */
      eventSource.onerror = (error) => {
        logger.error(LogCategory.EDITOR, '[useCanvasStreamOps] Connection error', {
          canvasRef,
          readyState: eventSource.readyState,
          reconnectAttempts: reconnectAttemptsRef.current
        });

        setIsConnected(false);
        eventSource.close();
        reconnectAttemptsRef.current += 1;

        const connectionError = new Error('SSE connection error');
        onErrorRef.current?.(connectionError);
      };

      /**
       * Handler pour l'ouverture de la connexion
       */
      eventSource.onopen = () => {
        if (debug) {
          logger.debug(LogCategory.EDITOR, '[useCanvasStreamOps] Connection opened', {
            canvasRef
          });
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };
    });

    // Cleanup
    return () => {
      if (debug) {
        logger.debug(LogCategory.EDITOR, '[useCanvasStreamOps] Cleanup', {
          canvasRef
        });
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsConnected(false);
    };
  }, [canvasRef, enabled, debug, getAuthToken]); // ✅ FIX: Callbacks retirés des dépendances (utilisés via refs)

  return {
    sendOp,
    sendBatch,
    isConnected,
    lastServerVersion,
    reconnectAttempts: reconnectAttemptsRef.current
  };
}

