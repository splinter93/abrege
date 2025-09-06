-- Migration: Extension de la table agents pour les agents spécialisés
-- Date: 2025-02-01
-- Description: Ajout des colonnes pour le système d'agents spécialisés avec endpoints dédiés

-- 1. Ajout des colonnes pour les agents spécialisés
ALTER TABLE agents ADD COLUMN IF NOT EXISTS slug VARCHAR UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS display_name VARCHAR;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_chat_agent BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_endpoint_agent BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS input_schema JSONB;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS output_schema JSONB;

-- 2. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_is_endpoint_agent ON agents(is_endpoint_agent);
CREATE INDEX IF NOT EXISTS idx_agents_is_chat_agent ON agents(is_chat_agent);
CREATE INDEX IF NOT EXISTS idx_agents_input_schema ON agents USING gin(input_schema);
CREATE INDEX IF NOT EXISTS idx_agents_output_schema ON agents USING gin(output_schema);

-- 3. Contraintes de validation
ALTER TABLE agents ADD CONSTRAINT check_slug_format 
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]+$');

ALTER TABLE agents ADD CONSTRAINT check_endpoint_agent_requirements
  CHECK (
    (is_endpoint_agent = false) OR 
    (is_endpoint_agent = true AND slug IS NOT NULL AND display_name IS NOT NULL)
  );

-- 4. Commentaires pour documentation
COMMENT ON COLUMN agents.slug IS 'Identifiant unique pour les agents spécialisés (ex: johnny, formatter, vision)';
COMMENT ON COLUMN agents.display_name IS 'Nom d''affichage de l''agent spécialisé';
COMMENT ON COLUMN agents.description IS 'Description de l''agent spécialisé et de ses capacités';
COMMENT ON COLUMN agents.is_chat_agent IS 'Agent visible dans l''interface de chat';
COMMENT ON COLUMN agents.is_endpoint_agent IS 'Agent avec endpoint dédié /api/v2/agents/{slug}';
COMMENT ON COLUMN agents.input_schema IS 'Schéma OpenAPI pour la validation des entrées';
COMMENT ON COLUMN agents.output_schema IS 'Schéma OpenAPI pour le formatage des sorties';

-- 5. Mise à jour des agents existants pour compatibilité
UPDATE agents 
SET 
  is_endpoint_agent = false,
  is_chat_agent = true,
  display_name = name
WHERE slug IS NULL;

-- 6. Exemple d'agent spécialisé de test (Johnny Query) - Llama 4 Scout
INSERT INTO agents (
  name, provider, model, system_instructions, temperature, max_tokens,
  is_active, priority, capabilities, api_v2_capabilities,
  slug, display_name, description, is_endpoint_agent, is_chat_agent,
  input_schema, output_schema
) VALUES (
  'Johnny Query', 'groq', 'meta-llama/llama-4-scout-17b-16e-instruct', 
  'Tu es Johnny, un assistant spécialisé dans l''analyse de notes et d''images. Tu réponds de manière précise et concise aux questions sur le contenu des notes et tu peux analyser des images. Tu utilises l''API v2 pour récupérer et analyser les notes. Tu es optimisé pour le raisonnement et l''analyse de contenu complexe, y compris multimodale.',
  0.7, 8192, true, 10,
  '["text", "images", "function_calling"]'::jsonb,
  ARRAY['get_note', 'search_notes', 'list_notes'],
  'johnny', 'Johnny Query', 'Agent spécialisé dans les questions sur les notes (Llama 4 Scout)',
  true, false,
  '{
    "type": "object",
    "properties": {
      "noteId": {"type": "string", "description": "ID de la note à analyser"},
      "query": {"type": "string", "description": "Question à poser sur la note"}
    },
    "required": ["noteId", "query"]
  }'::jsonb,
  '{
    "type": "object",
    "properties": {
      "answer": {"type": "string", "description": "Réponse à la question"},
      "confidence": {"type": "number", "description": "Niveau de confiance (0-1)"}
    }
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- 7. Exemple d'agent spécialisé de test (Formateur) - Llama 4 Scout
INSERT INTO agents (
  name, provider, model, system_instructions, temperature, max_tokens,
  is_active, priority, capabilities, api_v2_capabilities,
  slug, display_name, description, is_endpoint_agent, is_chat_agent,
  input_schema, output_schema
) VALUES (
  'Formateur', 'groq', 'meta-llama/llama-4-scout-17b-16e-instruct',
  'Tu es un expert en mise en forme de documents et d''images. Tu reformates le contenu markdown selon les instructions données et tu peux analyser des images pour extraire du texte. Tu utilises l''API v2 pour récupérer et modifier les notes. Tu es optimisé pour la compréhension et la transformation de contenu complexe, y compris multimodale.',
  0.5, 8192, true, 8,
  '["text", "images", "function_calling"]'::jsonb,
  ARRAY['get_note', 'update_note', 'search_notes'],
  'formatter', 'Formateur', 'Agent spécialisé dans la mise en forme des notes (Llama 4 Scout)',
  true, false,
  '{
    "type": "object",
    "properties": {
      "noteId": {"type": "string", "description": "ID de la note à formater"},
      "formatInstruction": {"type": "string", "description": "Instructions de mise en forme"}
    },
    "required": ["noteId", "formatInstruction"]
  }'::jsonb,
  '{
    "type": "object",
    "properties": {
      "success": {"type": "boolean", "description": "Succès de l''opération"},
      "formattedContent": {"type": "string", "description": "Contenu formaté"},
      "changes": {"type": "array", "description": "Liste des modifications apportées"}
    }
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- 8. Exemple d'agent multimodal (Vision) - Llama 4 Maverick
INSERT INTO agents (
  name, provider, model, system_instructions, temperature, max_tokens,
  is_active, priority, capabilities, api_v2_capabilities,
  slug, display_name, description, is_endpoint_agent, is_chat_agent,
  input_schema, output_schema
) VALUES (
  'Vision', 'groq', 'meta-llama/llama-4-maverick-17b-128e-instruct',
  'Tu es un assistant multimodal spécialisé dans l''analyse d''images et de documents visuels. Tu peux analyser des images, extraire du texte, identifier des éléments visuels et répondre à des questions sur le contenu visuel. Tu utilises l''API v2 pour récupérer et traiter les fichiers.',
  0.3, 8192, true, 12,
  '["text", "images", "function_calling"]'::jsonb,
  ARRAY['get_note', 'get_file', 'search_notes', 'search_files'],
  'vision', 'Vision', 'Agent multimodal pour analyse d''images et documents (Llama 4 Maverick)',
  true, false,
  '{
    "type": "object",
    "properties": {
      "imageUrl": {"type": "string", "description": "URL de l''image à analyser"},
      "task": {"type": "string", "description": "Tâche à effectuer sur l''image"},
      "noteId": {"type": "string", "description": "ID de la note contenant l''image (optionnel)"}
    },
    "required": ["imageUrl", "task"]
  }'::jsonb,
  '{
    "type": "object",
    "properties": {
      "analysis": {"type": "string", "description": "Analyse de l''image"},
      "extractedText": {"type": "string", "description": "Texte extrait de l''image"},
      "confidence": {"type": "number", "description": "Niveau de confiance (0-1)"},
      "elements": {"type": "array", "description": "Éléments identifiés dans l''image"}
    }
  }'::jsonb
) ON CONFLICT (slug) DO NOTHING;
