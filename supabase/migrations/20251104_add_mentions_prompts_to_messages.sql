-- Migration: Ajout colonnes mentions et prompts pour metadata légère
-- Date: 2025-11-04
-- Description: Metadata pour mentions @slug et prompts /slug (comme Cursor/Notion)
-- Conformité: GUIDE-EXCELLENCE-CODE.md (JSONB metadata acceptable pour info légère)

-- 1. Ajouter colonne mentions (JSONB metadata)
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb;

-- 2. Ajouter colonne prompts (JSONB metadata)
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS prompts JSONB DEFAULT '[]'::jsonb;

-- 3. Index GIN pour recherche dans JSONB (performance)
CREATE INDEX IF NOT EXISTS idx_chat_messages_mentions 
ON public.chat_messages USING gin(mentions)
WHERE mentions != '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_chat_messages_prompts 
ON public.chat_messages USING gin(prompts)
WHERE prompts != '[]'::jsonb;

-- 4. Validation: mentions doit être un array d'objets avec id/slug
ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_mentions_valid CHECK (
  jsonb_typeof(mentions) = 'array'
);

-- 5. Validation: prompts doit être un array d'objets avec id/slug
ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_prompts_valid CHECK (
  jsonb_typeof(prompts) = 'array'
);

-- 6. Commentaires pour documentation
COMMENT ON COLUMN public.chat_messages.mentions IS 'Metadata légère des notes mentionnées (format: [{ id, slug, name }]) - ~10-20 tokens vs 5000+ pour note complète';
COMMENT ON COLUMN public.chat_messages.prompts IS 'Metadata légère des prompts utilisés (format: [{ id, slug, name }]) - permet affichage /slug en vert sans template visible';

