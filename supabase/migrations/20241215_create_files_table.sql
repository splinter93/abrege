-- Migration: Création de la table files pour S3
-- Date: 2024-12-15
-- Description: Table pour gérer les fichiers uploadés via S3

-- Table files pour les fichiers S3
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  s3_key TEXT NOT NULL UNIQUE,
  s3_bucket TEXT NOT NULL,
  s3_region TEXT NOT NULL DEFAULT 'us-east-1',
  url TEXT,
  thumbnail_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_note_id ON files(note_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_notebook_id ON files(notebook_id);
CREATE INDEX IF NOT EXISTS idx_files_s3_key ON files(s3_key);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- RLS (Row Level Security)
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Politique RLS: utilisateurs voient seulement leurs fichiers
CREATE POLICY "Users can view own files" ON files
  FOR SELECT USING (auth.uid() = user_id);

-- Politique RLS: utilisateurs peuvent créer leurs fichiers
CREATE POLICY "Users can insert own files" ON files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique RLS: utilisateurs peuvent modifier leurs fichiers
CREATE POLICY "Users can update own files" ON files
  FOR UPDATE USING (auth.uid() = user_id);

-- Politique RLS: utilisateurs peuvent supprimer leurs fichiers
CREATE POLICY "Users can delete own files" ON files
  FOR DELETE USING (auth.uid() = user_id); 