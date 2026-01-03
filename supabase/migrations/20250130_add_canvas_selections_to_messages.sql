-- Migration: Ajout support canvas_selections dans chat_messages
-- Date: 2025-01-30
-- Description: Ajoute colonne canvas_selections JSONB pour persister les sélections de texte du canvas avec les messages
-- Conformité: GUIDE-EXCELLENCE-CODE.md

-- 1. Ajouter la colonne canvas_selections à chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS canvas_selections JSONB DEFAULT '[]'::jsonb;

-- 2. Commentaire sur la colonne
COMMENT ON COLUMN public.chat_messages.canvas_selections IS 
'Sélections de texte du canvas associées au message (JSONB array). Persistées pour restaurer le contexte lors du chargement de l''historique.';

-- 3. Mettre à jour la fonction add_message_atomic pour accepter canvas_selections
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
  p_canvas_selections JSONB DEFAULT NULL -- ✅ NOUVEAU : Sélections du canvas
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
  
  -- ✅ Insérer le message avec tous les champs (y compris canvas_selections)
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
    canvas_selections -- ✅ NOUVEAU
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
    COALESCE(p_canvas_selections, '[]'::jsonb) -- ✅ NOUVEAU : Default empty array
  )
  RETURNING * INTO new_message;
  
  RETURN new_message;
END;
$$;

-- 4. Mettre à jour le commentaire de la fonction
COMMENT ON FUNCTION public.add_message_atomic IS 
'Ajoute un message atomiquement avec sequence_number auto-incrémenté. Supporte mentions, prompts et canvas_selections metadata (JSONB). Retry automatique sur collision (UNIQUE constraint). Bypass RLS (SECURITY DEFINER).';

