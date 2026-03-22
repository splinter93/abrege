-- Mentions de notes dans les instructions système des agents (références @slug + métadonnées JSONB)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS system_instructions_mentions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN agents.system_instructions_mentions IS 'Liste JSON des mentions NoteMention (id, slug, title, …) pour résolution runtime du contenu des notes';
