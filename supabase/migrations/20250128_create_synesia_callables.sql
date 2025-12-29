-- Migration : Création des tables pour les callables Synesia
-- Date : 2025-01-28
-- Description : Permet aux agents d'utiliser des callables Synesia (agents, scripts, pipelines)

-- Table pour stocker les callables Synesia
CREATE TABLE IF NOT EXISTS synesia_callables (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('agent', 'script', 'request', 'callable-pipeline')),
  description TEXT,
  slug TEXT,
  icon TEXT,
  group_name TEXT,
  input_schema JSONB,
  output_schema JSONB,
  is_owner BOOLEAN DEFAULT true,
  auth TEXT DEFAULT 'NONE' CHECK (auth IN ('OAUTH', 'NONE')),
  oauth_system_id UUID,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de liaison many-to-many entre agents et callables
CREATE TABLE IF NOT EXISTS agent_callables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  callable_id UUID NOT NULL REFERENCES synesia_callables(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, callable_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_synesia_callables_slug ON synesia_callables(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_synesia_callables_type ON synesia_callables(type);
CREATE INDEX IF NOT EXISTS idx_synesia_callables_last_synced_at ON synesia_callables(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_agent_callables_agent_id ON agent_callables(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_callables_callable_id ON agent_callables(callable_id);

-- Constraint unique pour slug (si pas null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_synesia_callables_slug_unique 
  ON synesia_callables(slug) 
  WHERE slug IS NOT NULL;

-- RLS (Row Level Security)
ALTER TABLE synesia_callables ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_callables ENABLE ROW LEVEL SECURITY;

-- Policies pour synesia_callables
-- Note: Les callables sont globaux (pas user-scoped), tous les users peuvent les voir
CREATE POLICY "Users can view all Synesia callables"
  ON synesia_callables FOR SELECT
  USING (true);

-- Policies pour agent_callables (basées sur la propriété de l'agent)
CREATE POLICY "Users can view their agent callable links"
  ON agent_callables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_callables.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create agent callable links"
  ON agent_callables FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_callables.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE POLICY "Users can update their agent callable links"
  ON agent_callables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_callables.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_callables.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE POLICY "Users can delete their agent callable links"
  ON agent_callables FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_callables.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

-- Trigger pour updated_at automatique sur synesia_callables
CREATE TRIGGER update_synesia_callables_updated_at
  BEFORE UPDATE ON synesia_callables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at automatique sur agent_callables
CREATE TRIGGER update_agent_callables_updated_at
  BEFORE UPDATE ON agent_callables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE synesia_callables IS 'Callables Synesia disponibles (agents, scripts, pipelines, requests)';
COMMENT ON COLUMN synesia_callables.id IS 'ID du callable depuis Synesia (UUID)';
COMMENT ON COLUMN synesia_callables.name IS 'Nom du callable';
COMMENT ON COLUMN synesia_callables.type IS 'Type du callable: agent, script, request, callable-pipeline';
COMMENT ON COLUMN synesia_callables.description IS 'Description du callable';
COMMENT ON COLUMN synesia_callables.slug IS 'Slug unique pour accès par nom (nullable)';
COMMENT ON COLUMN synesia_callables.input_schema IS 'Schéma JSON Schema des inputs';
COMMENT ON COLUMN synesia_callables.output_schema IS 'Schéma JSON Schema des outputs';
COMMENT ON COLUMN synesia_callables.last_synced_at IS 'Dernière synchronisation depuis Synesia API';

COMMENT ON TABLE agent_callables IS 'Liaison many-to-many entre agents et callables Synesia';




