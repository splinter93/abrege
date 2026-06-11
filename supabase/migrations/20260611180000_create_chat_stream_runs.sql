-- Migration: chat_stream_runs — lifecycle des streams LLM (idempotence multi-instance)
-- Date: 2026-06-11

CREATE TABLE IF NOT EXISTS public.chat_stream_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_operation_id UUID NOT NULL,
  assistant_operation_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'cancelled', 'completed')),
  cancel_reason TEXT
    CHECK (cancel_reason IS NULL OR cancel_reason IN ('user_stop', 'superseded', 'client_disconnect')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_stream_runs_user_operation_id_key UNIQUE (user_operation_id),
  CONSTRAINT chat_stream_runs_assistant_operation_id_key UNIQUE (assistant_operation_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_stream_runs_session_status
  ON public.chat_stream_runs(session_id, status);

CREATE INDEX IF NOT EXISTS idx_chat_stream_runs_user_operation_id
  ON public.chat_stream_runs(user_operation_id);

CREATE INDEX IF NOT EXISTS idx_chat_stream_runs_assistant_operation_id
  ON public.chat_stream_runs(assistant_operation_id);

ALTER TABLE public.chat_stream_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stream runs"
  ON public.chat_stream_runs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stream runs"
  ON public.chat_stream_runs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stream runs"
  ON public.chat_stream_runs
  FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.chat_stream_runs IS
  'Tracks LLM stream lifecycle for cooperative cancel and persist guards (serverless-safe).';
