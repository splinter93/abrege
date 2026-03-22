-- Migration: Ajouter operation_id à add_message_atomic
-- Date: 2026-03-21
-- Description: Permet de stocker operation_id lors de l'insertion d'un message.
--   Utilisé pour déduplication côté client (Realtime echo de l'assistant).
--   Quand operation_id est présent et déjà en DB → retourne le message existant.

CREATE OR REPLACE FUNCTION public.add_message_atomic(
  p_session_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_tool_calls JSONB DEFAULT NULL,
  p_tool_call_id TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_reasoning TEXT DEFAULT NULL,
  p_timestamp TIMESTAMPTZ DEFAULT NOW(),
  p_attached_images JSONB DEFAULT NULL,
  p_attached_notes JSONB DEFAULT NULL,
  p_mentions JSONB DEFAULT NULL,
  p_prompts JSONB DEFAULT NULL,
  p_canvas_selections JSONB DEFAULT NULL,
  p_operation_id UUID DEFAULT NULL -- ✅ NOUVEAU : idempotence + dédup Realtime
)
RETURNS public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_message public.chat_messages;
  existing_message public.chat_messages;
  next_seq INT;
BEGIN
  -- ✅ Déduplication : si operation_id fourni et déjà en DB → retourner l'existant
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO existing_message
    FROM public.chat_messages
    WHERE operation_id = p_operation_id
      AND session_id = p_session_id
    LIMIT 1;

    IF FOUND THEN
      RETURN existing_message;
    END IF;
  END IF;

  -- ✅ Obtenir le prochain sequence_number (atomique)
  next_seq := public.get_next_sequence(p_session_id);

  -- ✅ Insérer le message avec tous les champs
  INSERT INTO public.chat_messages (
    session_id,
    sequence_number,
    role,
    content,
    tool_calls,
    tool_call_id,
    name,
    reasoning,
    timestamp,
    attached_images,
    attached_notes,
    mentions,
    prompts,
    canvas_selections,
    operation_id -- ✅ NOUVEAU
  ) VALUES (
    p_session_id,
    next_seq,
    p_role,
    p_content,
    p_tool_calls,
    p_tool_call_id,
    p_name,
    p_reasoning,
    p_timestamp,
    p_attached_images,
    p_attached_notes,
    COALESCE(p_mentions, '[]'::jsonb),
    COALESCE(p_prompts, '[]'::jsonb),
    COALESCE(p_canvas_selections, '[]'::jsonb),
    p_operation_id -- ✅ NOUVEAU
  )
  RETURNING * INTO new_message;

  RETURN new_message;
EXCEPTION
  WHEN unique_violation THEN
    -- Deux cas possibles :
    -- 1. Collision sequence_number (ultra-rare) → retry sans operation_id pour éviter boucle infinie
    -- 2. Collision operation_id (double-appel concurrent) → retourner l'existant
    IF p_operation_id IS NOT NULL THEN
      SELECT * INTO existing_message
      FROM public.chat_messages
      WHERE operation_id = p_operation_id
        AND session_id = p_session_id
      LIMIT 1;

      IF FOUND THEN
        RETURN existing_message;
      END IF;
    END IF;

    -- Collision sequence_number : retry
    RAISE NOTICE 'Collision sequence_number, retry...';
    RETURN public.add_message_atomic(
      p_session_id,
      p_role,
      p_content,
      p_tool_calls,
      p_tool_call_id,
      p_name,
      p_reasoning,
      p_timestamp,
      p_attached_images,
      p_attached_notes,
      p_mentions,
      p_prompts,
      p_canvas_selections,
      p_operation_id
    );
END;
$$;

COMMENT ON FUNCTION public.add_message_atomic IS
'Ajoute un message atomiquement avec sequence_number auto-incrémenté. Supporte operation_id pour déduplication (idempotence) — si operation_id déjà en DB, retourne l''existant. Bypass RLS (SECURITY DEFINER).';
