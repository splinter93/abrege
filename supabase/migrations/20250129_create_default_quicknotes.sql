-- ============================================================================
-- Migration: Création automatique du classeur "Quicknotes" par défaut
-- Date: 2025-01-29
-- Description: Chaque nouvel utilisateur reçoit automatiquement un classeur
--              "Quicknotes" pour capturer rapidement des notes sans friction
-- ============================================================================

-- 1. Fonction pour créer le classeur Quicknotes par défaut
-- ============================================================================
CREATE OR REPLACE FUNCTION create_default_quicknotes_classeur()
RETURNS TRIGGER AS $$
DECLARE
  quicknotes_slug TEXT;
BEGIN
  -- Générer un slug unique pour Quicknotes
  -- Format: quicknotes-{timestamp} pour garantir l'unicité
  quicknotes_slug := 'quicknotes-' || extract(epoch from now())::text;
  
  -- Créer le classeur Quicknotes par défaut
  INSERT INTO classeurs (
    id,
    name,
    slug,
    emoji,
    color,
    position,
    user_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'Quicknotes',
    quicknotes_slug,
    '⚡',
    '#10b981', -- Vert émeraude pour "rapide"
    0, -- Position 0 = premier classeur
    NEW.id,
    now(),
    now()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer le trigger sur auth.users pour les nouveaux utilisateurs
-- ============================================================================
DROP TRIGGER IF EXISTS create_default_quicknotes_trigger ON auth.users;
CREATE TRIGGER create_default_quicknotes_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_quicknotes_classeur();

-- 3. Créer le classeur Quicknotes pour les utilisateurs existants
-- ============================================================================
-- Cette partie s'exécute une seule fois lors de la migration
DO $$
DECLARE
  user_record RECORD;
  quicknotes_slug TEXT;
BEGIN
  -- Pour chaque utilisateur qui n'a pas encore de classeur Quicknotes
  FOR user_record IN 
    SELECT DISTINCT u.id 
    FROM auth.users u
    LEFT JOIN classeurs c ON c.user_id = u.id AND c.name = 'Quicknotes'
    WHERE c.id IS NULL
  LOOP
    -- Générer un slug unique
    quicknotes_slug := 'quicknotes-' || user_record.id || '-' || extract(epoch from now())::text;
    
    -- Créer le classeur
    INSERT INTO classeurs (
      id,
      name,
      slug,
      emoji,
      color,
      position,
      user_id,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'Quicknotes',
      quicknotes_slug,
      '⚡',
      '#10b981',
      0,
      user_record.id,
      now(),
      now()
    );
  END LOOP;
END $$;

-- 4. Commentaires pour documentation
-- ============================================================================
COMMENT ON FUNCTION create_default_quicknotes_classeur() IS 
  'Crée automatiquement un classeur Quicknotes pour chaque nouvel utilisateur';

