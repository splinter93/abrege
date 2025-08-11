-- Migration: Correction des politiques RLS pour l'API V2
-- Date: 2025-01-31
-- Description: Simplifie les politiques RLS pour permettre à l'API V2 de fonctionner

-- 1. Supprimer toutes les anciennes politiques complexes
DROP POLICY IF EXISTS "Users can view articles based on permissions" ON public.articles;
DROP POLICY IF EXISTS "Users can insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can update articles they own or have editor/owner permissions" ON public.articles;
DROP POLICY IF EXISTS "Users can delete articles they own or have owner permissions" ON public.articles;

DROP POLICY IF EXISTS "Users can view folders based on permissions" ON public.folders;
DROP POLICY IF EXISTS "Users can insert their own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update folders they own or have editor/owner permissions" ON public.folders;
DROP POLICY IF EXISTS "Users can delete folders they own or have owner permissions" ON public.folders;

DROP POLICY IF EXISTS "Users can view classeurs based on permissions" ON public.classeurs;
DROP POLICY IF EXISTS "Users can insert their own classeurs" ON public.classeurs;
DROP POLICY IF EXISTS "Users can update classeurs they own or have editor/owner permissions" ON public.classeurs;
DROP POLICY IF EXISTS "Users can delete classeurs they own or have owner permissions" ON public.classeurs;

-- 2. Créer des politiques simples et fonctionnelles pour les articles
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

-- 3. Créer des politiques simples pour les dossiers
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

-- 4. Créer des politiques simples pour les classeurs
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

-- 5. Vérifier que RLS est activé sur toutes les tables
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classeurs ENABLE ROW LEVEL SECURITY;

-- 6. Commentaires pour documenter
COMMENT ON TABLE public.articles IS 'RLS activé avec politiques simples pour l''API V2';
COMMENT ON TABLE public.folders IS 'RLS activé avec politiques simples pour l''API V2';
COMMENT ON TABLE public.classeurs IS 'RLS activé avec politiques simples pour l''API V2'; 