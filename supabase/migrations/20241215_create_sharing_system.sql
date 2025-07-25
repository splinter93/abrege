-- Migration: Système de partage et permissions
-- Date: 2024-12-15
-- Description: Tables pour gérer le partage de notes et permissions

-- Table pour les partages de notes
CREATE TABLE IF NOT EXISTS note_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
  is_public BOOLEAN DEFAULT FALSE,
  public_slug TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(note_id, shared_with)
);

-- Table pour les partages de dossiers
CREATE TABLE IF NOT EXISTS folder_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
  is_public BOOLEAN DEFAULT FALSE,
  public_slug TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(folder_id, shared_with)
);

-- Table pour les partages de notebooks
CREATE TABLE IF NOT EXISTS notebook_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
  is_public BOOLEAN DEFAULT FALSE,
  public_slug TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notebook_id, shared_with)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_note_shares_note_id ON note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_shared_with ON note_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_note_shares_public_slug ON note_shares(public_slug);

CREATE INDEX IF NOT EXISTS idx_folder_shares_folder_id ON folder_shares(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_shared_with ON folder_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_folder_shares_public_slug ON folder_shares(public_slug);

CREATE INDEX IF NOT EXISTS idx_notebook_shares_notebook_id ON notebook_shares(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_shares_shared_with ON notebook_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_notebook_shares_public_slug ON notebook_shares(public_slug);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_share_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_note_shares_updated_at
  BEFORE UPDATE ON note_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_share_updated_at();

CREATE TRIGGER set_folder_shares_updated_at
  BEFORE UPDATE ON folder_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_share_updated_at();

CREATE TRIGGER set_notebook_shares_updated_at
  BEFORE UPDATE ON notebook_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_share_updated_at();

-- RLS pour les partages
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_shares ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour note_shares
CREATE POLICY "Users can view own note shares" ON note_shares
  FOR SELECT USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can create note shares" ON note_shares
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can update own note shares" ON note_shares
  FOR UPDATE USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete own note shares" ON note_shares
  FOR DELETE USING (auth.uid() = shared_by);

-- Politiques RLS pour folder_shares
CREATE POLICY "Users can view own folder shares" ON folder_shares
  FOR SELECT USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can create folder shares" ON folder_shares
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can update own folder shares" ON folder_shares
  FOR UPDATE USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete own folder shares" ON folder_shares
  FOR DELETE USING (auth.uid() = shared_by);

-- Politiques RLS pour notebook_shares
CREATE POLICY "Users can view own notebook shares" ON notebook_shares
  FOR SELECT USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can create notebook shares" ON notebook_shares
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can update own notebook shares" ON notebook_shares
  FOR UPDATE USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete own notebook shares" ON notebook_shares
  FOR DELETE USING (auth.uid() = shared_by); 