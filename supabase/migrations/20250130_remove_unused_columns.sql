-- MIGRATION: remove_unused_columns
-- Description: Supprime les colonnes inutiles de la table articles
-- Date: 2025-01-30

-- Supprimer les colonnes inutiles de la table articles
ALTER TABLE articles DROP COLUMN IF EXISTS flash_summary;
ALTER TABLE articles DROP COLUMN IF EXISTS is_public;
ALTER TABLE articles DROP COLUMN IF EXISTS image_url;
ALTER TABLE articles DROP COLUMN IF EXISTS share_token;

-- Commentaire pour documenter les suppressions
COMMENT ON TABLE articles IS 'Table articles nettoyée - colonnes supprimées: flash_summary, is_public, image_url, share_token'; 