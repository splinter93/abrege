-- MIGRATION: disable_rls_for_testing
-- Description: Désactive temporairement RLS sur les tables pour tester le realtime

-- Désactiver RLS sur articles pour tester
ALTER TABLE public.articles DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur folders pour tester
ALTER TABLE public.folders DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur classeurs pour tester
ALTER TABLE public.classeurs DISABLE ROW LEVEL SECURITY; 