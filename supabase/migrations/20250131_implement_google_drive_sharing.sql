-- Migration: Implémentation du système de partage Google Drive
-- Date: 2025-01-31
-- Description: Remplace le système ispublished par un système de visibilité flexible

-- 1. Activer RLS sur la table articles (sécurité)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- 2. Ajouter la nouvelle colonne share_settings
ALTER TABLE articles ADD COLUMN IF NOT EXISTS share_settings 
  JSONB DEFAULT '{"visibility": "private", "invited_users": [], "allow_edit": false}'::jsonb;

-- 3. Créer un index pour optimiser les requêtes par visibilité
CREATE INDEX IF NOT EXISTS idx_articles_share_settings_visibility 
  ON articles USING GIN ((share_settings->>'visibility'));

-- 4. Créer un index pour les utilisateurs invités
CREATE INDEX IF NOT EXISTS idx_articles_share_settings_invited_users 
  ON articles USING GIN ((share_settings->'invited_users'));

-- 5. Migration des données existantes : convertir ispublished en visibility
UPDATE articles 
SET share_settings = CASE 
  WHEN ispublished = true THEN 
    jsonb_build_object(
      'visibility', 'link',
      'invited_users', '[]'::jsonb,
      'allow_edit', false
    )
  ELSE 
    jsonb_build_object(
      'visibility', 'private',
      'invited_users', '[]'::jsonb,
      'allow_edit', false
    )
END
WHERE share_settings IS NULL OR share_settings = '{}'::jsonb;

-- 6. S'assurer que toutes les notes ont une URL publique
UPDATE articles 
SET public_url = CASE 
  WHEN public_url IS NULL THEN 
    CONCAT(
      COALESCE(
        (SELECT username FROM users WHERE id = articles.user_id), 
        'unknown'
      ),
      '/notes/',
      COALESCE(slug, id)
    )
  ELSE public_url
END;

-- 7. Créer des contraintes de validation
ALTER TABLE articles ADD CONSTRAINT check_visibility_values 
  CHECK (
    share_settings->>'visibility' IN ('private', 'link', 'link-private', 'link-public', 'limited', 'scrivia')
  );

-- 8. Commentaires pour documenter le nouveau système
COMMENT ON COLUMN articles.share_settings IS 'Configuration de partage inspirée de Google Drive: private, link, limited, scrivia';
COMMENT ON COLUMN articles.public_url IS 'URL publique générée automatiquement pour toutes les notes';
COMMENT ON COLUMN articles.visibility IS 'Colonne legacy - sera supprimée après migration complète';

-- 9. Créer une fonction helper pour la gestion des permissions
CREATE OR REPLACE FUNCTION can_access_article(
  article_id UUID,
  user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  article_visibility TEXT;
  article_owner UUID;
  is_invited BOOLEAN;
BEGIN
  -- Récupérer les informations de l'article
  SELECT 
    share_settings->>'visibility',
    articles.user_id
  INTO article_visibility, article_owner
  FROM articles 
  WHERE id = article_id;
  
  -- Si l'article n'existe pas
  IF article_owner IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Propriétaire peut toujours accéder
  IF user_id = article_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Selon la visibilité
  CASE article_visibility
    WHEN 'private' THEN
      RETURN FALSE;
      
    WHEN 'link' THEN
      RETURN TRUE; -- Accès public via lien
      
    WHEN 'limited' THEN
      -- Vérifier si l'utilisateur est invité
      SELECT EXISTS(
        SELECT 1 FROM articles 
        WHERE id = article_id 
        AND share_settings->'invited_users' ? user_id::text
      ) INTO is_invited;
      RETURN is_invited;
      
    WHEN 'scrivia' THEN
      RETURN user_id IS NOT NULL; -- Utilisateur connecté
      
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Créer des politiques RLS basées sur le nouveau système
DROP POLICY IF EXISTS "Users can view articles based on permissions" ON articles;

CREATE POLICY "Users can view articles based on new sharing system"
ON articles FOR SELECT
USING (
  can_access_article(id, auth.uid())
);

-- 11. Politique pour la création (seul le propriétaire)
CREATE POLICY "Users can create their own articles"
ON articles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 12. Politique pour la mise à jour (propriétaire ou éditeurs invités)
CREATE POLICY "Users can update articles they own or have edit access"
ON articles FOR UPDATE
USING (
  auth.uid() = user_id OR 
  (share_settings->>'visibility' = 'limited' AND 
   share_settings->'invited_users' ? auth.uid()::text AND
   (share_settings->>'allow_edit')::boolean = true)
);

-- 13. Politique pour la suppression (propriétaire uniquement)
CREATE POLICY "Users can delete only their own articles"
ON articles FOR DELETE
USING (auth.uid() = user_id);

-- 14. Vérification finale
DO $$
DECLARE
  migration_count INTEGER;
BEGIN
  -- Compter les articles migrés
  SELECT COUNT(*) INTO migration_count
  FROM articles 
  WHERE share_settings IS NOT NULL 
    AND share_settings != '{}'::jsonb;
    
  RAISE NOTICE 'Migration terminée: % articles migrés vers le nouveau système de partage', migration_count;
END $$; 