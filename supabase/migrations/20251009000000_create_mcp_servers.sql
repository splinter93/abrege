-- Migration : Création des tables MCP pour les agents
-- Date : 2025-10-09
-- Description : Permet aux agents d'utiliser des serveurs MCP externes (Exa, ClickUp, Notion, etc.)

-- Table pour stocker les serveurs MCP
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  header TEXT DEFAULT 'x-api-key',
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de liaison many-to-many entre agents et serveurs MCP
CREATE TABLE IF NOT EXISTS agent_mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, mcp_server_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_mcp_servers_user_id ON mcp_servers(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_is_active ON mcp_servers(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_mcp_servers_agent_id ON agent_mcp_servers(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_mcp_servers_mcp_server_id ON agent_mcp_servers(mcp_server_id);

-- RLS (Row Level Security)
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_mcp_servers ENABLE ROW LEVEL SECURITY;

-- Policies pour mcp_servers
CREATE POLICY "Users can view their own MCP servers"
  ON mcp_servers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own MCP servers"
  ON mcp_servers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MCP servers"
  ON mcp_servers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MCP servers"
  ON mcp_servers FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour agent_mcp_servers
CREATE POLICY "Users can view their agent MCP links"
  ON agent_mcp_servers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_mcp_servers.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create agent MCP links"
  ON agent_mcp_servers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_mcp_servers.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE POLICY "Users can update agent MCP links"
  ON agent_mcp_servers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_mcp_servers.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_mcp_servers.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

CREATE POLICY "Users can delete agent MCP links"
  ON agent_mcp_servers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_mcp_servers.agent_id
        AND (agents.user_id = auth.uid() OR agents.user_id IS NULL)
    )
  );

-- Trigger pour updated_at automatique sur mcp_servers
CREATE TRIGGER update_mcp_servers_updated_at
  BEFORE UPDATE ON mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at automatique sur agent_mcp_servers
CREATE TRIGGER update_agent_mcp_servers_updated_at
  BEFORE UPDATE ON agent_mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE mcp_servers IS 'Serveurs MCP externes (Exa, ClickUp, Notion, etc.)';
COMMENT ON COLUMN mcp_servers.name IS 'Nom du serveur MCP';
COMMENT ON COLUMN mcp_servers.description IS 'Description du serveur MCP';
COMMENT ON COLUMN mcp_servers.url IS 'URL du serveur MCP';
COMMENT ON COLUMN mcp_servers.header IS 'Nom du header d''authentification (ex: x-api-key, Authorization)';
COMMENT ON COLUMN mcp_servers.api_key IS 'Clé API pour l''authentification';

COMMENT ON TABLE agent_mcp_servers IS 'Liaison many-to-many entre agents et serveurs MCP';
COMMENT ON COLUMN agent_mcp_servers.priority IS 'Ordre de priorité (0 = plus haute priorité)';

