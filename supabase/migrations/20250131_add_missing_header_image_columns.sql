-- Migration: Ajout des colonnes manquantes pour les images d'en-tête
-- Date: 2025-01-31
-- Description: Ajoute les colonnes manquantes pour les fonctionnalités d'image d'en-tête

-- Ajouter la colonne header_image_blur si elle n'existe pas
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS header_image_blur INTEGER DEFAULT 0;

-- Ajouter la colonne header_image_overlay si elle n'existe pas
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS header_image_overlay INTEGER DEFAULT 0;

-- Ajouter la colonne header_title_in_image si elle n'existe pas
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS header_title_in_image BOOLEAN DEFAULT false;

-- Ajouter la colonne wide_mode si elle n'existe pas
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS wide_mode BOOLEAN DEFAULT false;

-- Ajouter la colonne a4_mode si elle n'existe pas
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS a4_mode BOOLEAN DEFAULT false;

-- Ajouter la colonne slash_lang si elle n'existe pas
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS slash_lang TEXT DEFAULT 'en' CHECK (slash_lang IN ('fr', 'en'));

-- Ajouter la colonne font_family si elle n'existe pas
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Noto Sans';

-- Commentaires pour documenter
COMMENT ON COLUMN articles.header_image_blur IS 'Niveau de flou de l''image d''en-tête (0-5)';
COMMENT ON COLUMN articles.header_image_overlay IS 'Niveau d''overlay de l''image d''en-tête (0-5)';
COMMENT ON COLUMN articles.header_title_in_image IS 'Afficher le titre dans l''image d''en-tête';
COMMENT ON COLUMN articles.wide_mode IS 'Mode large pour l''éditeur';
COMMENT ON COLUMN articles.a4_mode IS 'Mode A4 pour l''éditeur';
COMMENT ON COLUMN articles.slash_lang IS 'Langue pour les commandes slash (fr/en)';
COMMENT ON COLUMN articles.font_family IS 'Famille de police pour l''éditeur';

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_articles_header_image_blur 
ON articles(header_image_blur) 
WHERE header_image_blur IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_articles_header_image_overlay 
ON articles(header_image_overlay) 
WHERE header_image_overlay IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_articles_header_title_in_image 
ON articles(header_title_in_image) 
WHERE header_title_in_image IS NOT NULL; 