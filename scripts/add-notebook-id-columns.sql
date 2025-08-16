-- Script simple pour ajouter les colonnes notebook_id manquantes
-- À exécuter directement dans Supabase SQL Editor

-- 1. Ajouter notebook_id à la table articles si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'articles' AND column_name = 'notebook_id'
    ) THEN
        ALTER TABLE articles ADD COLUMN notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Colonne notebook_id ajoutée à la table articles';
    ELSE
        RAISE NOTICE 'Colonne notebook_id existe déjà dans articles';
    END IF;
END $$;

-- 2. Ajouter notebook_id à la table folders si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'folders' AND column_name = 'notebook_id'
    ) THEN
        ALTER TABLE folders ADD COLUMN notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Colonne notebook_id ajoutée à la table folders';
    ELSE
        RAISE NOTICE 'Colonne notebook_id existe déjà dans folders';
    END IF;
END $$;

-- 3. Synchroniser les données existantes
UPDATE articles 
SET notebook_id = classeur_id 
WHERE classeur_id IS NOT NULL AND notebook_id IS NULL;

UPDATE folders 
SET notebook_id = classeur_id 
WHERE classeur_id IS NOT NULL AND notebook_id IS NULL;

-- 4. Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_articles_notebook_id ON articles(notebook_id) WHERE notebook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_notebook_id ON folders(notebook_id) WHERE notebook_id IS NOT NULL;

-- 5. Vérifier le résultat
SELECT 
    'articles' as table_name,
    COUNT(*) as total_rows,
    COUNT(notebook_id) as rows_with_notebook_id,
    COUNT(classeur_id) as rows_with_classeur_id
FROM articles
UNION ALL
SELECT 
    'folders' as table_name,
    COUNT(*) as total_rows,
    COUNT(notebook_id) as rows_with_notebook_id,
    COUNT(classeur_id) as rows_with_classeur_id
FROM folders; 