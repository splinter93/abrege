-- Migration: Ajout de la colonne header_image_offset
-- Date: 2024-12-16
-- Description: Ajoute la colonne pour stocker la position verticale de l'image d'en-tête

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS header_image_offset INTEGER DEFAULT 50;

-- Commentaire pour documenter
COMMENT ON COLUMN articles.header_image_offset IS 'Position verticale de l''image d''en-tête (0-100%)';

-- Index pour les performances (optionnel)
CREATE INDEX IF NOT EXISTS idx_articles_header_image_offset 
ON articles(header_image_offset) 
WHERE header_image_offset IS NOT NULL; 