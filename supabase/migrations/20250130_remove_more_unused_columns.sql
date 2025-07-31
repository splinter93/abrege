-- Suppression des colonnes inutilisées de la table articles
-- allow_comments et title_align peuvent être remises plus tard si besoin

ALTER TABLE articles DROP COLUMN IF EXISTS allow_comments;
ALTER TABLE articles DROP COLUMN IF EXISTS title_align;

COMMENT ON TABLE articles IS 'Table articles nettoyée - colonnes supprimées: flash_summary, is_public, image_url, share_token, allow_comments, title_align'; 