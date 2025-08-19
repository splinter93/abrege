-- ========================================
-- NETTOYAGE ET OPTIMISATION DE LA SÉCURITÉ DES FICHIERS
-- Date: 2025-01-31
-- Description: Nettoyage des politiques RLS dupliquées et optimisation
-- ========================================

-- ========================================
-- 1. NETTOYAGE DES POLITIQUES RLS DUPLIQUÉES
-- ========================================

-- Supprimer les anciennes politiques dupliquées
DROP POLICY IF EXISTS "files_delete_policy" ON files;
DROP POLICY IF EXISTS "files_insert_policy" ON files;
DROP POLICY IF EXISTS "files_owner_policy" ON files;
DROP POLICY IF EXISTS "files_public_select_policy" ON files;
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_update_policy" ON files;

-- ========================================
-- 2. VÉRIFICATION ET CORRECTION DES POLITIQUES
-- ========================================

-- Politique SELECT : utilisateurs voient leurs fichiers + fichiers publics
CREATE POLICY IF NOT EXISTS "Users can view own files" ON files
  FOR SELECT USING (
    (auth.uid() = user_id AND deleted_at IS NULL) OR
    (visibility = 'public'::file_visibility AND deleted_at IS NULL)
  );

-- Politique INSERT : utilisateurs peuvent créer leurs fichiers
CREATE POLICY IF NOT EXISTS "Users can insert own files" ON files
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    user_id IS NOT NULL
  );

-- Politique UPDATE : utilisateurs peuvent modifier leurs fichiers
CREATE POLICY IF NOT EXISTS "Users can update own files" ON files
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    deleted_at IS NULL
  );

-- Politique DELETE : utilisateurs peuvent supprimer leurs fichiers
CREATE POLICY IF NOT EXISTS "Users can delete own files" ON files
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- ========================================
-- 3. OPTIMISATION DES INDEXES
-- ========================================

-- Index pour les requêtes par utilisateur et statut
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_status_created 
ON files (user_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index pour les fichiers par dossier
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_folder_created 
ON files (user_id, folder_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index pour les fichiers supprimés (garbage collection)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_deleted_at 
ON files (deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Index pour les hash SHA-256 (déduplication)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_sha256 
ON files (sha256) 
WHERE sha256 IS NOT NULL;

-- Index pour les request_id (idempotence)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_request_id 
ON files (request_id) 
WHERE request_id IS NOT NULL;

-- ========================================
-- 4. VÉRIFICATION DES CONTRAINTES
-- ========================================

-- Vérifier que les contraintes de sécurité sont en place
DO $$
BEGIN
  -- Vérifier que RLS est actif
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'files' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS non activé sur la table files';
  END IF;

  -- Vérifier que les colonnes de sécurité existent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'files' 
    AND column_name = 'status'
  ) THEN
    RAISE EXCEPTION 'Colonne status manquante dans files';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'files' 
    AND column_name = 'sha256'
  ) THEN
    RAISE EXCEPTION 'Colonne sha256 manquante dans files';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'files' 
    AND column_name = 'deleted_at'
  ) THEN
    RAISE EXCEPTION 'Colonne deleted_at manquante dans files';
  END IF;

  RAISE NOTICE '✅ Toutes les vérifications de sécurité sont passées';
END $$;

-- ========================================
-- 5. MISE À JOUR DES STATUTS EXISTANTS
-- ========================================

-- Mettre à jour le statut des fichiers existants
UPDATE files 
SET status = 'ready' 
WHERE status IS NULL OR status = '';

-- Mettre à jour les fichiers supprimés
UPDATE files 
SET deleted_at = NOW() 
WHERE is_deleted = true AND deleted_at IS NULL;

-- ========================================
-- 6. VÉRIFICATION FINALE
-- ========================================

-- Afficher un résumé de l'état
SELECT 
  'files' as table_name,
  COUNT(*) as total_files,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_files,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_files,
  COUNT(*) FILTER (WHERE status = 'ready') as ready_files,
  COUNT(*) FILTER (WHERE status = 'uploading') as uploading_files,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_files,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_files
FROM files;

-- Vérifier les politiques RLS
SELECT 
  tablename,
  policyname,
  cmd,
  qual IS NOT NULL as has_condition
FROM pg_policies 
WHERE tablename = 'files'
ORDER BY cmd, policyname;

-- Vérifier les index
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'files'
ORDER BY indexname;

RAISE NOTICE '🎉 Nettoyage et optimisation de la sécurité des fichiers terminé avec succès !'; 