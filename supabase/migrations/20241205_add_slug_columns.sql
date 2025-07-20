-- Migration: Ajout des colonnes slug aux tables
-- Date: 2024-12-05

-- Ajouter la colonne slug à la table articles
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Créer un index unique sur slug et user_id pour les notes
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug_user_id 
ON articles(slug, user_id) 
WHERE slug IS NOT NULL;

-- Ajouter la colonne slug à la table folders
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Créer un index unique sur slug et user_id pour les dossiers
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_slug_user_id 
ON folders(slug, user_id) 
WHERE slug IS NOT NULL;

-- Ajouter la colonne slug à la table classeurs
ALTER TABLE classeurs 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Créer un index unique sur slug et user_id pour les classeurs
CREATE UNIQUE INDEX IF NOT EXISTS idx_classeurs_slug_user_id 
ON classeurs(slug, user_id) 
WHERE slug IS NOT NULL; 