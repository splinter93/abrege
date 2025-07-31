-- Migration: Ajout de la colonne visibility aux articles
-- Date: 2025-01-30
-- Description: Ajoute la colonne visibility pour gérer la visibilité des articles

-- 1. Ajouter la colonne visibility aux articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS visibility 
  TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'members', 'public'));

-- 2. Ajouter un index pour optimiser les requêtes par visibilité
CREATE INDEX IF NOT EXISTS idx_articles_visibility ON articles(visibility);

-- 3. Mettre à jour les articles existants avec la visibilité par défaut
UPDATE articles SET visibility = 'private' WHERE visibility IS NULL;

-- 4. Commentaire pour documenter la colonne
COMMENT ON COLUMN articles.visibility IS 'Niveau de visibilité de l''article: private, shared, members, public'; 