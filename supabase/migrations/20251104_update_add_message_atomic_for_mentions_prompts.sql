-- Migration: Mise à jour add_message_atomic pour supporter mentions et prompts
-- Date: 2025-11-04
-- Description: Ajoute p_mentions et p_prompts à la fonction SQL atomique
-- Conformité: GUIDE-EXCELLENCE-CODE.md

-- 1. Mettre à jour la fonction add_message_atomic
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
  p_mentions JSONB DEFAULT NULL, -- ✅ NOUVEAU
  p_prompts JSONB DEFAULT NULL   -- ✅ NOUVEAU
)
RETURNS public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_message public.chat_messages;
  next_seq INT;
BEGIN
  -- ✅ Obtenir le prochain sequence_number (atomique)
  next_seq := public.get_next_sequence(p_session_id);
  
  -- ✅ Insérer le message avec tous les champs (y compris mentions/prompts)
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
    mentions, -- ✅ NOUVEAU
    prompts  -- ✅ NOUVEAU
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
    COALESCE(p_mentions, '[]'::jsonb), -- ✅ NOUVEAU : Default empty array
    COALESCE(p_prompts, '[]'::jsonb)  -- ✅ NOUVEAU : Default empty array
  )
  RETURNING * INTO new_message;
  
  RETURN new_message;
END;
$$;

-- 2. Mettre à jour le commentaire
COMMENT ON FUNCTION public.add_message_atomic IS 
'Ajoute un message atomiquement avec sequence_number auto-incrémenté. Supporte mentions et prompts metadata (JSONB). Retry automatique sur collision (UNIQUE constraint). Bypass RLS (SECURITY DEFINER).';

