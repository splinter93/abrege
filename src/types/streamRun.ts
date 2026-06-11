/**
 * Types pour le lifecycle des streams LLM (table chat_stream_runs).
 */

export type StreamRunStatus = 'running' | 'cancelled' | 'completed';

export type StreamCancelReason = 'user_stop' | 'superseded' | 'client_disconnect';

export interface ChatStreamRun {
  id: string;
  session_id: string;
  user_id: string;
  user_operation_id: string;
  assistant_operation_id: string;
  status: StreamRunStatus;
  cancel_reason: StreamCancelReason | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterStreamRunParams {
  sessionId: string;
  userId: string;
  userOperationId: string;
  assistantOperationId: string;
}

export interface CancelStreamRunParams {
  assistantOperationId: string;
  reason: StreamCancelReason;
}

export interface AssertCanPersistParams {
  sessionId: string;
  userId: string;
  userOperationId: string | null;
  assistantOperationId: string;
}

export interface PersistGuardResult {
  allowed: boolean;
  reason?: string;
}
