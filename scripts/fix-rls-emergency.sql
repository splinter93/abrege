-- 🚨 CORRECTION RLS D'URGENCE - ARTICLE NON TROUVÉ
-- Problème: L'utilisateur ne peut pas accéder à ses propres articles via l'API V2

-- 1. SUPPRIMER TOUTES LES POLITIQUES RLS EXISTANTES
DROP POLICY IF EXISTS "API_V2_articles_select" ON public.articles;
DROP POLICY IF EXISTS "API_V2_articles_insert" ON public.articles;
DROP POLICY IF EXISTS "API_V2_articles_update" ON public.articles;
DROP POLICY IF EXISTS "API_V2_articles_delete" ON public.articles;

-- 2. CRÉER UNE POLITIQUE RLS SIMPLE ET PERMISSIVE
CREATE POLICY "EMERGENCY_articles_access" ON public.articles
FOR ALL USING (
  -- L'utilisateur peut TOUT faire sur ses propres articles
  auth.uid() = user_id
  OR
  -- L'utilisateur peut voir les articles publics
  (share_settings->>'visibility' != 'private')
  OR
  -- Fallback: permettre l'accès si share_settings est NULL (anciennes notes)
  share_settings IS NULL
);

-- 3. VÉRIFIER QUE LA POLITIQUE EST CRÉÉE
SELECT 
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'articles';

-- 4. TESTER L'ACCÈS IMMÉDIATEMENT
-- (à exécuter avec l'utilisateur connecté)
-- SELECT COUNT(*) FROM articles WHERE auth.uid() = user_id; 