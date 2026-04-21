import { simpleLogger as logger } from '@/utils/logger';
import { chatSessionService } from './chatSessionService';

// Helper types pour les messages de la DB
interface DBMessage {
  id?: string;
  role: string;
  content: string | null;
  tool_calls?: Array<{
    id?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
  timestamp?: string;
  created_at?: string;
  success?: boolean;
  code?: string;
  message?: string;
}

/** Aligné avec l'orchestrateur */
type ToolCall = {
  id?: string;                 // id du tool_call généré par le LLM (si présent)
  type?: 'function';
  function?: { name: string; arguments?: string };
};

type NormalizedToolResult = {
  tool_call_id: string;
  name: string;
  success: boolean;
  result: unknown;
  timestamp: string;
  code?: string;
  message?: string;
};

export interface ToolCallSyncResult {
  success: boolean;
  /** Nouveaux tool calls détectés depuis la dernière sync (delta) */
  toolCalls?: ToolCall[];
  /** Nouveaux tool results détectés depuis la dernière sync (delta) */
  toolResults?: NormalizedToolResult[];
  /** Stats facultatives */
  stats?: { scannedMessages: number; newCalls: number; newResults: number };
  error?: string;
}

type AutoSyncOptions = {
  /** ms entre 2 tentatives nominales */
  intervalMs?: number;
  /** d’abord un scan complet pour prime l’état (sans remonter à l’UI) */
  fullScanFirst?: boolean;
  /** callback à appeler quand de nouveaux deltas arrivent */
  onUpdate?: (delta: ToolCallSyncResult) => void;
  /** backoff simple sur erreurs */
  backoff?: { minMs: number; maxMs: number; factor: number };
};

type SessionState = {
  isSyncing: boolean;
  timer: NodeJS.Timeout | null;
  /** clés déjà vues (tool_calls & tool_results) */
  seen: Set<string>;
  /** interval courant (avec backoff dynamique) */
  currentIntervalMs: number;
  /** options de sync */
  options: Required<AutoSyncOptions>;
};

const DEFAULT_OPTIONS: Required<AutoSyncOptions> = {
  intervalMs: 2000,
  fullScanFirst: false,
  onUpdate: () => {},
  backoff: { minMs: 2000, maxMs: 20000, factor: 2 }
};

/**
 * Service de synchronisation des tool calls entre la persistance et l'interface.
 * - Multi-sessions
 * - Deltas sans doublons
 * - Backoff sur erreurs
 * - Callbacks d’update UI
 * N’ALTÈRE PAS la logique d’exécution LLM.
 */
export class ToolCallSyncService {
  private static instance: ToolCallSyncService;

  /** État par session */
  private sessions: Map<string, SessionState> = new Map();

  private constructor() {}

  static getInstance(): ToolCallSyncService {
    if (!ToolCallSyncService.instance) {
      ToolCallSyncService.instance = new ToolCallSyncService();
    }
    return ToolCallSyncService.instance;
  }

  /** Renvoie/installe l’état d’une session */
  private ensureSessionState(sessionId: string, opts?: AutoSyncOptions): SessionState {
    let state = this.sessions.get(sessionId);
    if (!state) {
      const mergedOpts: Required<AutoSyncOptions> = { ...DEFAULT_OPTIONS, ...(opts || {}) };
      state = {
        isSyncing: false,
        timer: null,
        seen: new Set<string>(),
        currentIntervalMs: mergedOpts.intervalMs,
        options: mergedOpts
      };
      this.sessions.set(sessionId, state);
    } else if (opts) {
      // mise à jour éventuelle des options
      state.options = { ...state.options, ...opts };
    }
    return state;
  }

  /**
   * 🔄 Synchronise depuis la DB et renvoie UNIQUEMENT les NOUVEAUTÉS (delta).
   * Ne modifie pas l’orchestrateur ; side-effects limités à l’état interne (seen).
   */
  async syncToolCallsFromDB(sessionId: string, _userToken: string): Promise<ToolCallSyncResult> {
    const state = this.ensureSessionState(sessionId);

    if (state.isSyncing) {
      logger.dev?.('[ToolCallSync] ⏳ sync déjà en cours — ignorée', { sessionId });
      return { success: false, error: 'Synchronisation déjà en cours' };
    }

    try {
      state.isSyncing = true;
      logger.dev?.('[ToolCallSync] 🔄 Début synchronisation', { sessionId });

      const response = await chatSessionService.getMessages(sessionId);
      if (!response?.success || !response?.data) throw new Error(response?.error || 'Erreur récupération messages');

      const rawMessages = Array.isArray(response.data.messages) ? response.data.messages : [];
      const messages: DBMessage[] = rawMessages
        .filter((m: unknown): m is DBMessage => typeof m === 'object' && m !== null)
        .map((m) => ({
          ...m,
          timestamp: m.timestamp !== undefined ? String(m.timestamp) : undefined
        }));
      const newCalls: ToolCall[] = [];
      const newResults: NormalizedToolResult[] = [];

      for (const message of messages) {
        // 1) Assistant → tool_calls proposés par le LLM
        if (message?.role === 'assistant' && Array.isArray(message?.tool_calls) && message.tool_calls.length > 0) {
          for (const tc of message.tool_calls) {
              const fnName = tc?.function?.name ?? '';
              const fnArgs = tc?.function?.arguments ?? '';
            const call: ToolCall = {
              id: tc?.id,
              type: 'function',
                function: { name: fnName, arguments: fnArgs }
            };
            const key = this.keyForToolCall(call, message);
            if (!state.seen.has(key)) {
              state.seen.add(key);
              newCalls.push(call);
            }
          }
        }

        // 2) Tool → résultats d’outil
        if (message?.role === 'tool' && (message?.tool_call_id || message?.name)) {
          const parsed = this.safeParseContent(message?.content) as Record<string, unknown> | null | undefined;
          const result: NormalizedToolResult = {
            tool_call_id: String(message?.tool_call_id || parsed?.tool_call_id || 'unknown'),
            name: String(message?.name || parsed?.name || 'unknown'),
            success: message.success !== false, // par défaut true si absent
            result: this.truncateResult(parsed ?? message?.content),
            timestamp: message?.timestamp || message?.created_at || new Date().toISOString(),
            code: message.code,
            message: message.message
          };
          const key = this.keyForToolResult(result, message);
          if (!state.seen.has(key)) {
            state.seen.add(key);
            newResults.push(result);
          }
        }
      }

      logger.dev?.('[ToolCallSync] ✅ Sync terminée', {
        sessionId,
        scanned: messages.length,
        newCalls: newCalls.length,
        newResults: newResults.length
      });

      return {
        success: true,
        toolCalls: newCalls,
        toolResults: newResults,
        stats: { scannedMessages: messages.length, newCalls: newCalls.length, newResults: newResults.length }
      };
    } catch (error) {
      const errorObj = error as { message?: string } | undefined;
      logger.error('[ToolCallSync] ❌ Erreur synchronisation', { sessionId, error: errorObj?.message || error });
      return { success: false, error: errorObj?.message || 'Erreur inconnue' };
    } finally {
      state.isSyncing = false;
    }
  }

  /**
   * 🚀 Démarre l’auto-sync pour une session (boucle setTimeout + backoff).
   * - Si `fullScanFirst` : 1er passage “amorce” l’état (seen) sans pousser d’updates.
   * - Ensuite : push des **deltas** via `onUpdate`.
   */
  startAutoSync(sessionId: string, userToken: string, options?: AutoSyncOptions): void {
    const state = this.ensureSessionState(sessionId, options);

    // Stop l’éventuel timer existant
    this.stopAutoSync(sessionId);

    const loop = async () => {
      // Amorçage : prime l’état sans notifier
      if (state.options.fullScanFirst && state.seen.size === 0) {
        const prime = await this.syncToolCallsFromDB(sessionId, userToken);
        if (!prime.success) {
          // backoff sur erreur
          state.currentIntervalMs = Math.min(
            state.options.backoff.maxMs,
            Math.max(state.options.backoff.minMs, state.currentIntervalMs * state.options.backoff.factor)
          );
          logger.warn('[ToolCallSync] ⚠️ Prime échoué — backoff', { sessionId, nextMs: state.currentIntervalMs });
        } else {
          // reset interval normal
          state.currentIntervalMs = state.options.intervalMs;
        }
      } else {
        const delta = await this.syncToolCallsFromDB(sessionId, userToken);
        if (delta.success && ((delta.toolCalls?.length || 0) > 0 || (delta.toolResults?.length || 0) > 0)) {
          try { state.options.onUpdate(delta); } catch (cbErr) { logger.warn('[ToolCallSync] ⚠️ onUpdate error', cbErr); }
          // reset interval normal
          state.currentIntervalMs = state.options.intervalMs;
        } else if (!delta.success) {
          // backoff progressif sur erreur
          state.currentIntervalMs = Math.min(
            state.options.backoff.maxMs,
            Math.max(state.options.backoff.minMs, state.currentIntervalMs * state.options.backoff.factor)
          );
          logger.warn('[ToolCallSync] ⚠️ Sync error — backoff', { sessionId, nextMs: state.currentIntervalMs, err: delta.error });
        } else {
          // pas de nouveautés → interval normal
          state.currentIntervalMs = state.options.intervalMs;
        }
      }

      // Replanifie
      state.timer = setTimeout(loop, state.currentIntervalMs);
    };

    logger.dev?.('[ToolCallSync] 🚀 Auto-sync démarré', { sessionId, intervalMs: state.currentIntervalMs });
    state.timer = setTimeout(loop, state.currentIntervalMs);
  }

  /**
   * 🛑 Stoppe l’auto-sync d’une session (ou de toutes si non fourni)
   */
  stopAutoSync(sessionId?: string): void {
    if (!sessionId) {
      // stop all
      for (const [sid, s] of this.sessions) {
        if (s.timer) clearTimeout(s.timer);
        s.timer = null;
      }
      this.sessions.clear();
      logger.dev?.('[ToolCallSync] 🛑 Auto-sync stoppé pour TOUTES les sessions');
      return;
    }

    const state = this.sessions.get(sessionId);
    if (state?.timer) clearTimeout(state.timer);
    if (state) {
      state.timer = null;
      logger.dev?.('[ToolCallSync] 🛑 Auto-sync stoppé', { sessionId });
    }
    // On garde l’état (seen) au cas où on redémarre ; appeler `resetSession` pour purger.
  }

  /**
   * 🔍 Indique s’il y a potentiellement des nouveautés (déclenche une sync delta)
   */
  async checkPendingSync(sessionId: string, userToken: string): Promise<boolean> {
    const delta = await this.syncToolCallsFromDB(sessionId, userToken);
    return !!delta.success && (!!(delta.toolCalls?.length) || !!(delta.toolResults?.length));
  }

  /**
   * ♻️ Permet de purger l’état d’une session (seen, backoff, etc.)
   */
  resetSession(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    if (state) {
      state.seen.clear();
      state.currentIntervalMs = state.options.intervalMs;
      logger.dev?.('[ToolCallSync] 🔁 Session reset', { sessionId });
    }
  }

  /* ---------------------- Helpers ---------------------- */

  private keyForToolCall(call: ToolCall, msg: DBMessage): string {
    const id = call.id ?? '';
    const name = call.function?.name ?? '';
    // arguments potentiellement volumineux → hash cheap
    const args = call.function?.arguments ? this.cheapHash(call.function.arguments) : '';
    const mid = msg?.id || msg?.created_at || msg?.timestamp || '';
    return `CALL:${id}:${name}:${args}:${mid}`;
  }

  private keyForToolResult(res: NormalizedToolResult, msg: DBMessage): string {
    const mid = msg?.id || msg?.created_at || msg?.timestamp || '';
    return `RESULT:${res.tool_call_id}:${res.name}:${mid}`;
  }

  private cheapHash(input: string): string {
    // hash ultra cheap (pas cryptographique) pour éviter d’emmagasiner des args géants dans la clé
    let h = 0;
    for (let i = 0; i < input.length; i++) {
      h = (h << 5) - h + input.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  }

  private safeParseContent(content: unknown): unknown {
    if (typeof content !== 'string') return content;
    try {
      return JSON.parse(content);
    } catch {
      return content; // pas JSON → on renvoie brut
    }
  }

  /** Tronque le résultat (UTF-8 safe non garantie ici, suffisant pour l'UI) */
  private truncateResult(result: unknown, byteLimit = 16 * 1024): unknown {
    try {
      const str = typeof result === 'string' ? result : JSON.stringify(result);
      const enc = new TextEncoder().encode(str);
      if (enc.length <= byteLimit) return result;
      const slice = enc.slice(0, byteLimit);
      const dec = new TextDecoder().decode(slice);
      return typeof result === 'string' ? `${dec}...` : JSON.parse(dec);
    } catch {
      return result;
    }
  }
}

// Export singleton
export const toolCallSyncService = ToolCallSyncService.getInstance();