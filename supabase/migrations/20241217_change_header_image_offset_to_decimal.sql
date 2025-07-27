-- Migration: Changement du type de header_image_offset pour plus de précision
-- Date: 2024-12-17
-- Description: Change le type de INTEGER à DECIMAL(5,2) pour permettre 2 décimales

-- D'abord, créer une nouvelle colonne avec le bon type
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS header_image_offset_new DECIMAL(5,2) DEFAULT 50.00;

-- Copier les données existantes
UPDATE articles 
SET header_image_offset_new = header_image_offset::DECIMAL(5,2) 
WHERE header_image_offset IS NOT NULL;

-- Supprimer l'ancienne colonne
ALTER TABLE articles 
DROP COLUMN IF EXISTS header_image_offset;

-- Renommer la nouvelle colonne
ALTER TABLE articles 
RENAME COLUMN header_image_offset_new TO header_image_offset;

-- Mettre à jour le commentaire
COMMENT ON COLUMN articles.header_image_offset IS 'Position verticale de l''image d''en-tête (0-100.00%)';

-- Recréer l'index
DROP INDEX IF EXISTS idx_articles_header_image_offset;
CREATE INDEX IF NOT EXISTS idx_articles_header_image_offset 
ON articles(header_image_offset) 
WHERE header_image_offset IS NOT NULL; 