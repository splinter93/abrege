-- Script de correction des politiques RLS pour permettre l'accès public aux notes
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer toutes les anciennes politiques RLS problématiques
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

-- 2. Créer des politiques RLS qui permettent l'accès public aux notes partagées
-- Politique SELECT : permettre la lecture des notes publiques ET des notes privées de l'utilisateur
CREATE POLICY "Public access to shared articles and private access to own articles"
ON public.articles
FOR SELECT
USING (
  -- Notes publiques (accessibles à tous)
  (share_settings->>'visibility' != 'private') OR
  -- Notes privées (accessibles uniquement au propriétaire)
  (share_settings->>'visibility' = 'private' AND auth.uid() = user_id) OR
  -- Fallback si share_settings est NULL (anciennes notes)
  (share_settings IS NULL AND auth.uid() = user_id)
);

-- Politique INSERT : permettre à l'utilisateur de créer ses propres notes
CREATE POLICY "Users can create their own articles"
ON public.articles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique UPDATE : permettre à l'utilisateur de modifier ses propres notes
CREATE POLICY "Users can update their own articles"
ON public.articles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique DELETE : permettre à l'utilisateur de supprimer ses propres notes
CREATE POLICY "Users can delete their own articles"
ON public.articles
FOR DELETE
USING (auth.uid() = user_id);

-- 3. S'assurer que RLS est activé
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- 4. Vérifier que les politiques sont créées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'articles' 
ORDER BY policyname;

-- 5. Tester l'accès public (doit retourner des résultats)
-- Cette requête devrait fonctionner même sans authentification
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE WHEN share_settings->>'visibility' != 'private' THEN 1 END) as public_articles,
  COUNT(CASE WHEN share_settings->>'visibility' = 'private' THEN 1 END) as private_articles,
  COUNT(CASE WHEN share_settings IS NULL THEN 1 END) as articles_without_sharing
FROM public.articles; 