-- Migration: Correction de l'incohérence notebook_id vs classeur_id
-- Date: 2025-01-30
-- Description: Synchronisation des colonnes notebook_id et classeur_id pour assurer la cohérence

-- 1. S'assurer que notebook_id existe dans articles et folders
DO $$ 
BEGIN
    -- Ajouter notebook_id à articles s'il n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'notebook_id') THEN
        ALTER TABLE articles ADD COLUMN notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;
    END IF;
    
    -- Ajouter notebook_id à folders s'il n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'folders' AND column_name = 'notebook_id') THEN
        ALTER TABLE folders ADD COLUMN notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Synchroniser notebook_id avec classeur_id pour les enregistrements existants
-- Articles
UPDATE articles 
SET notebook_id = classeur_id 
WHERE classeur_id IS NOT NULL AND notebook_id IS NULL;

-- Folders
UPDATE folders 
SET notebook_id = classeur_id 
WHERE classeur_id IS NOT NULL AND notebook_id IS NULL;

-- 3. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_articles_notebook_id ON articles(notebook_id) WHERE notebook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folders_notebook_id ON folders(notebook_id) WHERE notebook_id IS NOT NULL;

-- 4. Créer des contraintes de validation pour assurer la cohérence
-- Les deux colonnes doivent pointer vers le même classeur/notebook
ALTER TABLE articles 
ADD CONSTRAINT check_articles_notebook_classeur_consistency 
CHECK (
    (notebook_id IS NULL AND classeur_id IS NULL) OR
    (notebook_id IS NOT NULL AND classeur_id IS NOT NULL AND notebook_id = classeur_id)
);

ALTER TABLE folders 
ADD CONSTRAINT check_folders_notebook_classeur_consistency 
CHECK (
    (notebook_id IS NULL AND classeur_id IS NULL) OR
    (notebook_id IS NOT NULL AND classeur_id IS NOT NULL AND notebook_id = classeur_id)
);

-- 5. Créer des triggers pour maintenir la cohérence automatiquement
CREATE OR REPLACE FUNCTION maintain_notebook_classeur_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Si notebook_id est mis à jour, synchroniser classeur_id
    IF TG_OP = 'UPDATE' AND NEW.notebook_id IS DISTINCT FROM OLD.notebook_id THEN
        NEW.classeur_id = NEW.notebook_id;
    END IF;
    
    -- Si classeur_id est mis à jour, synchroniser notebook_id
    IF TG_OP = 'UPDATE' AND NEW.classeur_id IS DISTINCT FROM OLD.classeur_id THEN
        NEW.notebook_id = NEW.classeur_id;
    END IF;
    
    -- Si c'est un nouvel enregistrement, s'assurer que les deux sont identiques
    IF TG_OP = 'INSERT' THEN
        IF NEW.notebook_id IS NOT NULL AND NEW.classeur_id IS NULL THEN
            NEW.classeur_id = NEW.notebook_id;
        ELSIF NEW.classeur_id IS NOT NULL AND NEW.notebook_id IS NULL THEN
            NEW.notebook_id = NEW.classeur_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables articles et folders
DROP TRIGGER IF EXISTS trigger_maintain_notebook_classeur_consistency_articles ON articles;
CREATE TRIGGER trigger_maintain_notebook_classeur_consistency_articles
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION maintain_notebook_classeur_consistency();

DROP TRIGGER IF EXISTS trigger_maintain_notebook_classeur_consistency_folders ON folders;
CREATE TRIGGER trigger_maintain_notebook_classeur_consistency_folders
    BEFORE INSERT OR UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION maintain_notebook_classeur_consistency();

-- 6. Commentaires pour documentation
COMMENT ON FUNCTION maintain_notebook_classeur_consistency() IS 'Maintient automatiquement la cohérence entre notebook_id et classeur_id';
COMMENT ON CONSTRAINT check_articles_notebook_classeur_consistency ON articles IS 'Assure que notebook_id et classeur_id pointent vers le même classeur';
COMMENT ON CONSTRAINT check_folders_notebook_classeur_consistency ON folders IS 'Assure que notebook_id et classeur_id pointent vers le même classeur'; 