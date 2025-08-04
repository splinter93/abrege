-- Migration: Enrichissement de la table agents pour le système template
-- Date: 2025-01-31
-- Description: Ajout des colonnes pour la configuration dynamique des agents

-- 1. Ajout des colonnes de configuration LLM
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'deepseek-chat';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 4000;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS system_instructions TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS context_template TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_config JSONB DEFAULT '{}'::jsonb;

-- 2. Ajout des colonnes de personnalisation
ALTER TABLE agents ADD COLUMN IF NOT EXISTS personality TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS expertise TEXT[];
ALTER TABLE agents ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '[]'::jsonb;

-- 3. Ajout des colonnes de gestion
ALTER TABLE agents ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- 4. Contraintes pour la validation
ALTER TABLE agents ADD CONSTRAINT check_temperature_range 
  CHECK (temperature >= 0.0 AND temperature <= 2.0);

ALTER TABLE agents ADD CONSTRAINT check_top_p_range 
  CHECK (top_p >= 0.0 AND top_p <= 1.0);

ALTER TABLE agents ADD CONSTRAINT check_max_tokens_positive 
  CHECK (max_tokens > 0);

-- 5. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_agents_provider_model ON agents(provider, model);
CREATE INDEX IF NOT EXISTS idx_agents_is_default ON agents(is_default);
CREATE INDEX IF NOT EXISTS idx_agents_priority ON agents(priority);
CREATE INDEX IF NOT EXISTS idx_agents_expertise ON agents USING gin(expertise);

-- 6. Commentaires pour documentation
COMMENT ON COLUMN agents.model IS 'Modèle LLM utilisé par l''agent (ex: deepseek-chat, deepseek-vision)';
COMMENT ON COLUMN agents.max_tokens IS 'Nombre maximum de tokens pour la réponse';
COMMENT ON COLUMN agents.system_instructions IS 'Instructions système personnalisées pour l''agent';
COMMENT ON COLUMN agents.context_template IS 'Template de contexte avec variables {{variable}}';
COMMENT ON COLUMN agents.api_config IS 'Configuration spécifique à l''API (headers, endpoints, etc.)';
COMMENT ON COLUMN agents.personality IS 'Description de la personnalité de l''agent';
COMMENT ON COLUMN agents.expertise IS 'Domaines d''expertise de l''agent';
COMMENT ON COLUMN agents.capabilities IS 'Capacités spéciales de l''agent (vision, function calling, etc.)';
COMMENT ON COLUMN agents.version IS 'Version de la configuration de l''agent';
COMMENT ON COLUMN agents.is_default IS 'Si cet agent est l''agent par défaut';
COMMENT ON COLUMN agents.priority IS 'Priorité d''utilisation (plus élevé = prioritaire)';

-- 7. Mise à jour des agents existants avec des valeurs par défaut
UPDATE agents 
SET 
  system_instructions = 'Tu es un assistant IA utile et bienveillant.',
  context_template = '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}',
  personality = 'Assistant IA professionnel et serviable',
  expertise = ARRAY['assistance générale'],
  capabilities = '["text"]'::jsonb,
  api_config = '{"baseUrl": "https://api.deepseek.com/v1", "endpoint": "/chat/completions"}'::jsonb
WHERE system_instructions IS NULL; 