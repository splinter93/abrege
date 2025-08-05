-- Migration: Ajouter la colonne description à la table classeurs
-- Date: 2024-12-20

-- Ajouter la colonne description si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classeurs' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE classeurs ADD COLUMN description TEXT;
    END IF;
END $$;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN classeurs.description IS 'Description optionnelle du classeur'; 