-- MIGRATION: fix_rls_policies
-- Description: Corrige les politiques RLS pour permettre la création de notes

-- 1. Supprimer les anciennes politiques sur 'articles' pour éviter les conflits
DROP POLICY IF EXISTS "Allow all users to select articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to delete their own articles" ON public.articles;

-- 2. Créer des politiques plus permissives pour le développement
-- Permet à tous les utilisateurs de voir les articles
CREATE POLICY "Allow all users to select articles"
ON public.articles
FOR SELECT
USING (true);

-- Permet à tous les utilisateurs de créer des articles (temporaire pour développement)
CREATE POLICY "Allow all users to insert articles"
ON public.articles
FOR INSERT
WITH CHECK (true);

-- Permet à tous les utilisateurs de modifier les articles (temporaire pour développement)
CREATE POLICY "Allow all users to update articles"
ON public.articles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Permet à tous les utilisateurs de supprimer les articles (temporaire pour développement)
CREATE POLICY "Allow all users to delete articles"
ON public.articles
FOR DELETE
USING (true); 