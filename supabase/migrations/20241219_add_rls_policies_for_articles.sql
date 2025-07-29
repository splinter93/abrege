-- MIGRATION: add_rls_policies_for_articles
-- Description: Ajoute les politiques de sécurité (RLS) nécessaires pour permettre l'écoute en temps réel (SELECT) sur la table 'articles'.
-- Sans ces politiques, Supabase bloque les abonnements realtime par défaut.

-- 1. Activer RLS sur la table 'articles' si ce n'est pas déjà fait
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques sur 'articles' pour éviter les conflits (bonne pratique)
DROP POLICY IF EXISTS "Allow user to select their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to delete their own articles" ON public.articles;

-- 3. Créer la politique SELECT pour les articles (notes) - TEMPORAIREMENT OUVERTE POUR TEST
-- Permet à tous les utilisateurs de voir les articles pour tester le realtime
CREATE POLICY "Allow all users to select articles"
ON public.articles
FOR SELECT
USING (true);

-- 4. Créer la politique INSERT pour les articles
CREATE POLICY "Allow user to insert their own articles"
ON public.articles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Créer la politique UPDATE pour les articles
CREATE POLICY "Allow user to update their own articles"
ON public.articles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Créer la politique DELETE pour les articles
CREATE POLICY "Allow user to delete their own articles"
ON public.articles
FOR DELETE
USING (auth.uid() = user_id); 