-- ✅ STRUCTURE COMPLÈTE ET CONFORME AU GUIDE D'EXCELLENCE
-- Migration créée: 2025-01-30
-- Mise à jour pour refléter prod: 2025-11-03
-- 
-- Conformité:
-- ✅ sequence_number + UNIQUE constraint (atomicité, prévention race conditions)
-- ✅ timestamp en TIMESTAMPTZ (pas BIGINT)
-- ✅ FK vers chat_sessions (pas user_id direct)
-- ✅ Support complet streaming (stream_timeline, tool_results)
-- ✅ Support attachments (images, notes)
-- ✅ Indexes optimisés (GIN pour JSONB, B-tree pour sequence)

-- Création de la table chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_call_id TEXT,
  name TEXT,
  reasoning TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stream_timeline JSONB,
  tool_results JSONB,
  attached_images JSONB,
  attached_notes JSONB
);

-- ✅ UNIQUE constraint atomique (CRITIQUE: prévient race conditions)
CREATE UNIQUE INDEX IF NOT EXISTS unique_session_sequence 
ON public.chat_messages(session_id, sequence_number);

-- Index pour performance (queries fréquentes)
CREATE INDEX IF NOT EXISTS idx_messages_session_sequence 
ON public.chat_messages(session_id, sequence_number DESC);

CREATE INDEX IF NOT EXISTS idx_messages_session_timestamp 
ON public.chat_messages(session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_messages_tool_call_id 
ON public.chat_messages(tool_call_id) 
WHERE tool_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_role 
ON public.chat_messages(session_id, role);

-- Index GIN pour requêtes JSONB (recherche dans timelines/results)
CREATE INDEX IF NOT EXISTS idx_chat_messages_stream_timeline 
ON public.chat_messages USING GIN(stream_timeline);

CREATE INDEX IF NOT EXISTS idx_chat_messages_tool_results 
ON public.chat_messages USING GIN(tool_results);

-- Politiques RLS (accès via session ownership)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs messages via la session
CREATE POLICY "Users can view messages from their sessions"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.uid()
  )
);

-- Les utilisateurs peuvent insérer des messages dans leurs sessions
CREATE POLICY "Users can insert messages in their sessions"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.uid()
  )
);

-- Les utilisateurs peuvent mettre à jour leurs messages
CREATE POLICY "Users can update messages in their sessions"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.uid()
  )
);

-- Les utilisateurs peuvent supprimer leurs messages
CREATE POLICY "Users can delete messages in their sessions"
ON public.chat_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.uid()
  )
);

-- Commentaires
COMMENT ON TABLE public.chat_messages IS 'Messages du chat avec sequence_number atomique (0 race condition). Structure conforme GUIDE-EXCELLENCE-CODE.md';
COMMENT ON COLUMN public.chat_messages.session_id IS 'Session parente (FK vers chat_sessions)';
COMMENT ON COLUMN public.chat_messages.sequence_number IS 'Numéro de séquence atomique dans la session (UNIQUE constraint)';
COMMENT ON COLUMN public.chat_messages.role IS 'Rôle: user, assistant, tool, system';
COMMENT ON COLUMN public.chat_messages.content IS 'Contenu du message (texte, markdown)';
COMMENT ON COLUMN public.chat_messages.tool_calls IS 'Tool calls demandés par le LLM (format OpenAI)';
COMMENT ON COLUMN public.chat_messages.tool_call_id IS 'ID du tool call (pour messages role=tool)';
COMMENT ON COLUMN public.chat_messages.name IS 'Nom du tool (pour messages role=tool)';
COMMENT ON COLUMN public.chat_messages.reasoning IS 'Raisonnement interne (modèles avec CoT)';
COMMENT ON COLUMN public.chat_messages.timestamp IS 'Timestamp du message (TIMESTAMPTZ, pas BIGINT)';
COMMENT ON COLUMN public.chat_messages.stream_timeline IS 'Timeline chronologique du streaming (pour StreamTimelineRenderer)';
COMMENT ON COLUMN public.chat_messages.tool_results IS 'Résultats des tool calls (array avec {tool_call_id, name, content, success})';
COMMENT ON COLUMN public.chat_messages.attached_images IS 'Images attachées (user) - array de {url, fileName}';
COMMENT ON COLUMN public.chat_messages.attached_notes IS 'Notes attachées (user) - array de {id, slug, title, word_count}';
