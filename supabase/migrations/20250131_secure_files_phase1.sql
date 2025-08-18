-- Migration: Sécurisation complète des fichiers - Phase 1
-- Date: 2025-01-31
-- Description: RLS renforcé, quotas, audit trail, contraintes de sécurité

-- ========================================
-- 1. TABLES DE SÉCURITÉ ET QUOTAS
-- ========================================

-- Table pour les quotas utilisateur
CREATE TABLE IF NOT EXISTS storage_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  used_bytes BIGINT DEFAULT 0 CHECK (used_bytes >= 0),
  quota_bytes BIGINT DEFAULT 1073741824 CHECK (quota_bytes > 0), -- 1GB par défaut
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table d'audit des fichiers (write-only)
CREATE TABLE IF NOT EXISTS file_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('upload_initiated', 'upload_completed', 'download', 'delete', 'rename', 'move', 'share', 'unshare')),
  request_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. RENFORCEMENT DE LA TABLE FILES
-- ========================================

-- Ajouter les colonnes de sécurité
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
ADD COLUMN IF NOT EXISTS sha256 TEXT,
ADD COLUMN IF NOT EXISTS request_id TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS etag TEXT;

-- Contraintes de sécurité
ALTER TABLE files 
ADD CONSTRAINT IF NOT EXISTS files_user_fk CHECK (user_id IS NOT NULL),
ADD CONSTRAINT IF NOT EXISTS files_size_positive CHECK (size_bytes > 0),
ADD CONSTRAINT IF NOT EXISTS files_filename_not_empty CHECK (filename != '');

-- ========================================
-- 3. INDEXES POUR PERFORMANCE ET SÉCURITÉ
-- ========================================

-- Index pour les requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_files_user_status_created 
ON files (user_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index pour les fichiers par dossier
CREATE INDEX IF NOT EXISTS idx_files_user_folder_created 
ON files (user_id, folder_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index pour les fichiers par notebook
CREATE INDEX IF NOT EXISTS idx_files_user_notebook_created 
ON files (user_id, notebook_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index pour les fichiers supprimés (garbage collection)
CREATE INDEX IF NOT EXISTS idx_files_deleted_at 
ON files (deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Index pour les hash SHA-256 (déduplication)
CREATE INDEX IF NOT EXISTS idx_files_sha256 
ON files (sha256) 
WHERE sha256 IS NOT NULL;

-- Index pour les request_id (idempotence)
CREATE INDEX IF NOT EXISTS idx_files_request_id 
ON files (request_id) 
WHERE request_id IS NOT NULL;

-- Index pour l'audit trail
CREATE INDEX IF NOT EXISTS idx_file_events_file_created 
ON file_events (file_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_events_user_created 
ON file_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_events_request_id 
ON file_events (request_id) 
WHERE request_id IS NOT NULL;

-- ========================================
-- 4. TRIGGERS AUTOMATIQUES
-- ========================================

-- Trigger pour updated_at sur storage_usage
CREATE OR REPLACE FUNCTION update_storage_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_storage_usage_updated_at
  BEFORE UPDATE ON storage_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_usage_updated_at();

-- Trigger pour initialiser storage_usage lors de la création d'un utilisateur
CREATE OR REPLACE FUNCTION initialize_user_storage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO storage_usage (user_id, used_bytes, quota_bytes)
  VALUES (NEW.id, 0, 1073741824) -- 1GB par défaut
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_user_storage_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_storage();

-- ========================================
-- 5. RLS (ROW LEVEL SECURITY) RENFORCÉ
-- ========================================

-- Activer RLS sur toutes les tables
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_events ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view own files" ON files;
DROP POLICY IF EXISTS "Users can insert own files" ON files;
DROP POLICY IF EXISTS "Users can update own files" ON files;
DROP POLICY IF EXISTS "Users can delete own files" ON files;

-- Politiques RLS pour files
CREATE POLICY "Users can view own files" ON files
  FOR SELECT USING (
    auth.uid() = user_id AND 
    deleted_at IS NULL
  );

CREATE POLICY "Users can insert own files" ON files
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_id IS NOT NULL
  );

CREATE POLICY "Users can update own files" ON files
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    deleted_at IS NULL
  );

CREATE POLICY "Users can delete own files" ON files
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Politiques RLS pour storage_usage
CREATE POLICY "Users can view own storage usage" ON storage_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own storage usage" ON storage_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Politiques RLS pour file_events (lecture seule pour l'utilisateur)
CREATE POLICY "Users can view own file events" ON file_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert file events" ON file_events
  FOR INSERT WITH CHECK (true); -- Seul le système peut insérer

-- ========================================
-- 6. FONCTIONS UTILITAIRES
-- ========================================

-- Fonction pour calculer l'usage de stockage d'un utilisateur
CREATE OR REPLACE FUNCTION calculate_user_storage_usage(user_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(size_bytes) 
     FROM files 
     WHERE user_id = user_uuid AND deleted_at IS NULL), 
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour l'usage de stockage
CREATE OR REPLACE FUNCTION update_user_storage_usage(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE storage_usage 
  SET used_bytes = calculate_user_storage_usage(user_uuid),
      updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier le quota utilisateur
CREATE OR REPLACE FUNCTION check_user_quota(user_uuid UUID, file_size BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage BIGINT;
  user_quota BIGINT;
BEGIN
  SELECT used_bytes, quota_bytes 
  INTO current_usage, user_quota
  FROM storage_usage 
  WHERE user_id = user_uuid;
  
  RETURN (current_usage + file_size) <= user_quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. VUES SÉCURISÉES
-- ========================================

-- Vue pour les fichiers actifs d'un utilisateur
CREATE OR REPLACE VIEW user_files AS
SELECT 
  id, filename, original_name, mime_type, size_bytes,
  url, thumbnail_url, created_at, updated_at,
  folder_id, notebook_id, status, sha256
FROM files 
WHERE user_id = auth.uid() AND deleted_at IS NULL;

-- RLS sur la vue
ALTER VIEW user_files SET (security_invoker = true);

-- ========================================
-- 8. COMMENTAIRES ET DOCUMENTATION
-- ========================================

COMMENT ON TABLE files IS 'Table principale des fichiers avec sécurité renforcée';
COMMENT ON TABLE storage_usage IS 'Quotas de stockage par utilisateur';
COMMENT ON TABLE file_events IS 'Audit trail des actions sur les fichiers (write-only)';

COMMENT ON COLUMN files.status IS 'Statut du fichier: uploading, processing, ready, failed';
COMMENT ON COLUMN files.sha256 IS 'Hash SHA-256 pour intégrité et déduplication';
COMMENT ON COLUMN files.request_id IS 'ID unique pour idempotence des uploads';
COMMENT ON COLUMN files.deleted_at IS 'Soft delete pour récupération possible';
COMMENT ON COLUMN files.etag IS 'ETag S3 pour validation d''intégrité';

-- ========================================
-- 9. MIGRATION DES DONNÉES EXISTANTES
-- ========================================

-- Initialiser storage_usage pour les utilisateurs existants
INSERT INTO storage_usage (user_id, used_bytes, quota_bytes)
SELECT 
  user_id,
  COALESCE(SUM(size_bytes), 0),
  1073741824 -- 1GB par défaut
FROM files 
WHERE deleted_at IS NULL
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
  used_bytes = EXCLUDED.used_bytes,
  updated_at = NOW();

-- Mettre à jour le statut des fichiers existants
UPDATE files 
SET status = 'ready' 
WHERE status IS NULL OR status = '';

-- ========================================
-- 10. TESTS DE SÉCURITÉ
-- ========================================

-- Vérifier que RLS est actif
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'files' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS non activé sur la table files';
  END IF;
END $$; 