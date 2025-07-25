-- Migration: Renommage de la table classeurs en notebooks
-- Date: 2024-12-15
-- Description: Renommage sécurisé avec préservation des données et contraintes

-- Étape 1: Créer la nouvelle table notebooks avec la même structure
CREATE TABLE IF NOT EXISTS notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  slug TEXT,
  position INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Étape 2: Copier toutes les données de classeurs vers notebooks
INSERT INTO notebooks (id, name, emoji, color, slug, position, user_id, created_at, updated_at)
SELECT id, name, emoji, color, slug, position, user_id, created_at, updated_at
FROM classeurs;

-- Étape 3: Créer les index sur la nouvelle table
CREATE UNIQUE INDEX IF NOT EXISTS idx_notebooks_slug_user_id 
ON notebooks(slug, user_id) 
WHERE slug IS NOT NULL;

-- Étape 4: Mettre à jour les contraintes de clés étrangères
-- Mettre à jour la colonne classeur_id dans articles
ALTER TABLE articles 
ADD COLUMN notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;

-- Copier les données de classeur_id vers notebook_id
UPDATE articles 
SET notebook_id = classeur_id 
WHERE classeur_id IS NOT NULL;

-- Mettre à jour la colonne classeur_id dans folders  
ALTER TABLE folders 
ADD COLUMN notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;

-- Copier les données de classeur_id vers notebook_id
UPDATE folders 
SET notebook_id = classeur_id 
WHERE classeur_id IS NOT NULL;

-- Étape 5: Supprimer les anciennes colonnes (après vérification)
-- ALTER TABLE articles DROP COLUMN IF EXISTS classeur_id;
-- ALTER TABLE folders DROP COLUMN IF EXISTS classeur_id;

-- Étape 6: Supprimer l'ancienne table (après vérification)
-- DROP TABLE IF EXISTS classeurs;

-- Note: Les étapes 5 et 6 sont commentées pour sécurité
-- Les exécuter manuellement après vérification des données 