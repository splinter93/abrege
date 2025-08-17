-- Script de correction des politiques RLS pour l'API V2
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer TOUTES les anciennes politiques RLS problématiques
DROP POLICY IF EXISTS "Users can view articles based on permissions" ON public.articles;
DROP POLICY IF EXISTS "Users can view articles based on new sharing system" ON public.articles;
DROP POLICY IF EXISTS "Users can view their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can delete their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to select articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to delete their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to insert articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to update articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to delete articles" ON public.articles;
DROP POLICY IF EXISTS "Public access to shared articles and private access to own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can create their own articles" ON public.articles;

-- 2. Créer des politiques RLS SIMPLES et FONCTIONNELLES pour l'API V2

-- Politique SELECT : permettre à l'utilisateur de voir ses propres articles ET les articles publics
CREATE POLICY "API_V2_articles_select"
ON public.articles
FOR SELECT
USING (
  -- L'utilisateur peut voir ses propres articles (privés ou publics)
  auth.uid() = user_id
  OR
  -- L'utilisateur peut voir les articles publics d'autres utilisateurs
  (share_settings->>'visibility' != 'private')
);

-- Politique INSERT : permettre à l'utilisateur de créer ses propres articles
CREATE POLICY "API_V2_articles_insert"
ON public.articles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique UPDATE : permettre à l'utilisateur de modifier ses propres articles
CREATE POLICY "API_V2_articles_update"
ON public.articles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique DELETE : permettre à l'utilisateur de supprimer ses propres articles
CREATE POLICY "API_V2_articles_delete"
ON public.articles
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Appliquer les mêmes politiques aux autres tables

-- Folders
DROP POLICY IF EXISTS "Users can view folders based on permissions" ON public.folders;
DROP POLICY IF EXISTS "Users can view their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON public.folders;

CREATE POLICY "API_V2_folders_select" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "API_V2_folders_insert" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "API_V2_folders_update" ON public.folders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "API_V2_folders_delete" ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- Classeurs/Notebooks
DROP POLICY IF EXISTS "Users can view classeurs based on permissions" ON public.classeurs;
DROP POLICY IF EXISTS "Users can view their own classeurs" ON public.classeurs;
DROP POLICY IF EXISTS "Users can insert their own classeurs" ON public.classeurs;
DROP POLICY IF EXISTS "Users can update their own classeurs" ON public.classeurs;
DROP POLICY IF EXISTS "Users can delete their own classeurs" ON public.classeurs;

CREATE POLICY "API_V2_classeurs_select" ON public.classeurs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "API_V2_classeurs_insert" ON public.classeurs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "API_V2_classeurs_update" ON public.classeurs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "API_V2_classeurs_delete" ON public.classeurs FOR DELETE USING (auth.uid() = user_id);

-- 4. S'assurer que RLS est activé sur toutes les tables
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classeurs ENABLE ROW LEVEL SECURITY;

-- 5. Vérifier que les politiques sont créées
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename IN ('articles', 'folders', 'classeurs')
ORDER BY tablename, policyname;

-- 6. Test de la nouvelle politique SELECT
-- Cette requête devrait maintenant fonctionner pour un utilisateur authentifié
-- SELECT COUNT(*) FROM public.articles WHERE user_id = auth.uid(); 