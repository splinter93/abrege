import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/utils/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';
import type {
  AssertCanPersistParams,
  CancelStreamRunParams,
  ChatStreamRun,
  PersistGuardResult,
  RegisterStreamRunParams,
  StreamRunStatus
} from '@/types/streamRun';

/**
 * Lifecycle des streams LLM — source de vérité DB (compatible serverless / multi-instance).
 */
export class StreamLifecycleService {
  private static instance: StreamLifecycleService | null = null;

  constructor(private readonly supabase: SupabaseClient) {}

  static getInstance(supabase?: SupabaseClient): StreamLifecycleService {
    if (!StreamLifecycleService.instance) {
      StreamLifecycleService.instance = new StreamLifecycleService(supabase ?? createSupabaseClient());
    } else if (supabase) {
      StreamLifecycleService.instance = new StreamLifecycleService(supabase);
    }
    return StreamLifecycleService.instance;
  }

  /** Test helper — reset singleton */
  static resetForTests(supabase?: SupabaseClient): StreamLifecycleService {
    StreamLifecycleService.instance = new StreamLifecycleService(supabase ?? createSupabaseClient());
    return StreamLifecycleService.instance;
  }

  async registerRun(params: RegisterStreamRunParams): Promise<void> {
    const { sessionId, userId, userOperationId, assistantOperationId } = params;
    const now = new Date().toISOString();

    const row = {
      session_id: sessionId,
      user_id: userId,
      user_operation_id: userOperationId,
      assistant_operation_id: assistantOperationId,
      status: 'running' as const,
      cancel_reason: null,
      updated_at: now
    };

    // Un tour user = une ligne lifecycle : réutiliser la ligne si même user_operation_id
    const { error: userOpConflictError } = await this.supabase
      .from('chat_stream_runs')
      .upsert(row, { onConflict: 'user_operation_id' });

    if (!userOpConflictError) {
      return;
    }

    // Re-register idempotent du même stream (même assistant_operation_id)
    const { error: assistantOpConflictError } = await this.supabase
      .from('chat_stream_runs')
      .upsert(row, { onConflict: 'assistant_operation_id' });

    if (assistantOpConflictError) {
      logger.error('[StreamLifecycleService] registerRun failed', {
        sessionId,
        userOperationId,
        assistantOperationId,
        userOpError: userOpConflictError.message,
        assistantOpError: assistantOpConflictError.message
      });
      throw new Error(`Failed to register stream run: ${assistantOpConflictError.message}`);
    }
  }

  /**
   * Vérifie qu'un run appartient à la session demandée (garde cancel route).
   * @returns null si aucun run (legacy) ; mismatch si run lié à une autre session
   */
  async resolveRunForSession(
    assistantOperationId: string,
    sessionId: string
  ): Promise<ChatStreamRun | null | 'session_mismatch'> {
    const run = await this.getRun(assistantOperationId);
    if (!run) {
      return null;
    }
    if (run.session_id !== sessionId) {
      return 'session_mismatch';
    }
    return run;
  }

  async cancelRun(params: CancelStreamRunParams): Promise<boolean> {
    const { assistantOperationId, reason } = params;
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('chat_stream_runs')
      .update({
        status: 'cancelled',
        cancel_reason: reason,
        updated_at: now
      })
      .eq('assistant_operation_id', assistantOperationId)
      .eq('status', 'running')
      .select('id')
      .maybeSingle();

    if (error) {
      logger.error('[StreamLifecycleService] cancelRun failed', {
        assistantOperationId,
        reason,
        error: error.message
      });
      throw new Error(`Failed to cancel stream run: ${error.message}`);
    }

    return Boolean(data);
  }

  async completeRun(assistantOperationId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from('chat_stream_runs')
      .update({ status: 'completed', updated_at: now })
      .eq('assistant_operation_id', assistantOperationId)
      .eq('status', 'running');

    if (error) {
      logger.warn('[StreamLifecycleService] completeRun failed', {
        assistantOperationId,
        error: error.message
      });
    }
  }

  async getRun(assistantOperationId: string): Promise<ChatStreamRun | null> {
    const { data, error } = await this.supabase
      .from('chat_stream_runs')
      .select('*')
      .eq('assistant_operation_id', assistantOperationId)
      .maybeSingle();

    if (error) {
      logger.warn('[StreamLifecycleService] getRun failed', {
        assistantOperationId,
        error: error.message
      });
      return null;
    }

    return data as ChatStreamRun | null;
  }

  async getRunStatus(assistantOperationId: string): Promise<StreamRunStatus | null> {
    const run = await this.getRun(assistantOperationId);
    return run?.status ?? null;
  }

  async isActive(assistantOperationId: string): Promise<boolean> {
    const run = await this.getRun(assistantOperationId);
    // Pas de ligne lifecycle → flux legacy / registerRun non appelé : ne pas bloquer le stream
    if (!run) {
      return true;
    }
    return run.status === 'running';
  }

  async assertCanPersistAssistant(params: AssertCanPersistParams): Promise<PersistGuardResult> {
    const { sessionId, userId, userOperationId, assistantOperationId } = params;

    const isActive = await this.isActive(assistantOperationId);
    if (!isActive) {
      return { allowed: false, reason: 'stream_run_not_active' };
    }

    const { data: ownedSession } = await this.supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!ownedSession) {
      return { allowed: false, reason: 'session_not_owned' };
    }

    if (!userOperationId) {
      return { allowed: true };
    }

    const { data: parentUserMessage } = await this.supabase
      .from('chat_messages')
      .select('id, sequence_number')
      .eq('session_id', sessionId)
      .eq('operation_id', userOperationId)
      .eq('role', 'user')
      .maybeSingle();

    if (!parentUserMessage) {
      return { allowed: false, reason: 'parent_user_missing' };
    }

    const { data: latestUserMessage } = await this.supabase
      .from('chat_messages')
      .select('sequence_number')
      .eq('session_id', sessionId)
      .eq('role', 'user')
      .order('sequence_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const parentSeq = parentUserMessage.sequence_number;
    const latestSeq = latestUserMessage?.sequence_number;

    if (
      typeof parentSeq === 'number' &&
      typeof latestSeq === 'number' &&
      parentSeq < latestSeq
    ) {
      return { allowed: false, reason: 'stale_user_turn' };
    }

    return { allowed: true };
  }
}

export const streamLifecycleService = StreamLifecycleService.getInstance();
