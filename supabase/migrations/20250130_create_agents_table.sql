-- Migration: Création de la table agents
-- Date: 2025-01-30
-- Description: Table de base pour les agents conversationnels et spécialisés

-- Création de la table agents
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'groq',
  temperature NUMERIC(3,2) DEFAULT 0.7,
  top_p NUMERIC(3,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Colonnes API V2
  api_v2_capabilities TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(provider);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);

-- RLS Policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres agents
CREATE POLICY "Users can view own agents" ON agents
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres agents
CREATE POLICY "Users can create own agents" ON agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent modifier leurs propres agents
CREATE POLICY "Users can update own agents" ON agents
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres agents
CREATE POLICY "Users can delete own agents" ON agents
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Admins peuvent tout voir (optionnel)
CREATE POLICY "Service role can access all agents" ON agents
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger pour updated_at
CREATE TRIGGER update_agents_updated_at 
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE agents IS 'Table des agents conversationnels et spécialisés';
COMMENT ON COLUMN agents.name IS 'Nom de l''agent (ex: Donna, Johnny, Vision)';
COMMENT ON COLUMN agents.provider IS 'Provider LLM (groq, openai, anthropic)';
COMMENT ON COLUMN agents.temperature IS 'Température de génération (0.0-2.0)';
COMMENT ON COLUMN agents.top_p IS 'Top-p pour le sampling (0.0-1.0)';
COMMENT ON COLUMN agents.is_active IS 'Si l''agent est actif et disponible';
COMMENT ON COLUMN agents.api_v2_capabilities IS 'Capacités API V2 de l''agent (scopes)';

