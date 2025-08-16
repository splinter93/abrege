-- Migration: Restauration des politiques RLS fonctionnelles
-- Date: 2025-01-31
-- Description: Restaure les politiques RLS simples qui fonctionnaient avant les migrations complexes
-- Cette migration remplace toutes les politiques cassées par des politiques simples et fonctionnelles

-- 1. Supprimer TOUTES les anciennes politiques cassées
DROP POLICY IF EXISTS "Users can view articles based on permissions" ON public.articles;
DROP POLICY IF EXISTS "Users can insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can update articles they own or have editor/owner permissions" ON public.articles;
DROP POLICY IF EXISTS "Users can delete articles they own or have owner permissions" ON public.articles;

DROP POLICY IF EXISTS "Users can view articles based on new sharing system" ON public.articles;
DROP POLICY IF EXISTS "Users can create their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can update articles they own or have edit access" ON public.articles;
DROP POLICY IF EXISTS "Users can delete only their own articles" ON public.articles;

DROP POLICY IF EXISTS "Allow all users to select articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to delete their own articles" ON public.articles;

DROP POLICY IF EXISTS "Allow all users to insert articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to update articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to delete articles" ON public.articles;

-- 2. Supprimer les politiques sur les autres tables aussi
DROP POLICY IF EXISTS "Users can view folders based on permissions" ON public.folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update folders they own or have editor/owner permissions" ON public.folders;
DROP POLICY IF EXISTS "Users can delete folders they own or have owner permissions" ON public.folders;

DROP POLICY IF EXISTS "Users can view classeurs based on permissions" ON public.classeurs;
DROP POLICY IF EXISTS "Users can insert their own classeurs" ON public.classeurs;
DROP POLICY IF EXISTS "Users can update classeurs they own or have editor/owner permissions" ON public.classeurs;
DROP POLICY IF EXISTS "Users can delete classeurs they own or have owner permissions" ON public.classeurs;

-- 3. Créer des politiques RLS SIMPLES et FONCTIONNELLES pour articles
-- Ces politiques permettent à chaque utilisateur d'accéder à ses propres données
CREATE POLICY "Users can view their own articles"
ON public.articles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own articles"
ON public.articles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own articles"
ON public.articles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own articles"
ON public.articles
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Créer des politiques RLS SIMPLES pour folders
CREATE POLICY "Users can view their own folders"
ON public.folders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders"
ON public.folders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON public.folders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON public.folders
FOR DELETE
USING (auth.uid() = user_id);

-- 5. Créer des politiques RLS SIMPLES pour classeurs
CREATE POLICY "Users can view their own classeurs"
ON public.classeurs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own classeurs"
ON public.classeurs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own classeurs"
ON public.classeurs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own classeurs"
ON public.classeurs
FOR DELETE
USING (auth.uid() = user_id);

-- 6. S'assurer que RLS est activé sur toutes les tables
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classeurs ENABLE ROW LEVEL SECURITY;

-- 7. Commentaires pour documenter
COMMENT ON TABLE public.articles IS 'RLS restauré avec politiques simples et fonctionnelles - chaque utilisateur accède à ses propres données';
COMMENT ON TABLE public.folders IS 'RLS restauré avec politiques simples et fonctionnelles - chaque utilisateur accède à ses propres données';
COMMENT ON TABLE public.classeurs IS 'RLS restauré avec politiques simples et fonctionnelles - chaque utilisateur accède à ses propres données';

-- 8. Vérification finale
DO $$
DECLARE
  article_policies INTEGER;
  folder_policies INTEGER;
  classeur_policies INTEGER;
BEGIN
  -- Compter les politiques sur articles
  SELECT COUNT(*) INTO article_policies
  FROM pg_policies 
  WHERE tablename = 'articles' AND schemaname = 'public';
  
  -- Compter les politiques sur folders
  SELECT COUNT(*) INTO folder_policies
  FROM pg_policies 
  WHERE tablename = 'folders' AND schemaname = 'public';
  
  -- Compter les politiques sur classeurs
  SELECT COUNT(*) INTO classeur_policies
  FROM pg_policies 
  WHERE tablename = 'classeurs' AND schemaname = 'public';
  
  RAISE NOTICE 'Restauration RLS terminée:';
  RAISE NOTICE '- Articles: % politiques', article_policies;
  RAISE NOTICE '- Folders: % politiques', folder_policies;
  RAISE NOTICE '- Classeurs: % politiques', classeur_policies;
  RAISE NOTICE 'Toutes les politiques sont maintenant simples et fonctionnelles';
END $$; 