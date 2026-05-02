-- Datasources Synesia (liste /datasources/available) + liaison agents

CREATE TABLE IF NOT EXISTS synesia_datasources (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  customization JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_datasources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  datasource_id UUID NOT NULL REFERENCES synesia_datasources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, datasource_id)
);

CREATE INDEX IF NOT EXISTS idx_synesia_datasources_project_id ON synesia_datasources(project_id);
CREATE INDEX IF NOT EXISTS idx_synesia_datasources_type ON synesia_datasources(type);
CREATE INDEX IF NOT EXISTS idx_synesia_datasources_last_synced_at ON synesia_datasources(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_agent_datasources_agent_id ON agent_datasources(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_datasources_datasource_id ON agent_datasources(datasource_id);

ALTER TABLE synesia_datasources ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_datasources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all Synesia datasources"
  ON synesia_datasources FOR SELECT
  USING (true);

CREATE POLICY "Users can view their agent datasource links"
  ON agent_datasources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_datasources.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create agent datasource links"
  ON agent_datasources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_datasources.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE POLICY "Users can update their agent datasource links"
  ON agent_datasources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_datasources.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_datasources.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE POLICY "Users can delete their agent datasource links"
  ON agent_datasources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_datasources.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE TRIGGER update_synesia_datasources_updated_at
  BEFORE UPDATE ON synesia_datasources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_datasources_updated_at
  BEFORE UPDATE ON agent_datasources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE synesia_datasources IS 'Datasources Synesia (knowledge, memory, kv_storage, spreadsheet, …)';
COMMENT ON TABLE agent_datasources IS 'Liaison many-to-many entre agents et datasources Synesia';
