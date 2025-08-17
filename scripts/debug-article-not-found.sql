-- 🚨 DEBUG ARTICLE NON TROUVÉ
-- Article ID: fce40443-4893-4e14-ba94-73d08020c722

-- 1. Vérifier si l'article existe
SELECT 
  id,
  source_title,
  user_id,
  slug,
  share_settings,
  created_at
FROM articles 
WHERE id = 'fce40443-4893-4e14-ba94-73d08020c722';

-- 2. Vérifier les politiques RLS sur la table articles
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'articles';

-- 3. Vérifier l'utilisateur connecté (remplacer par l'ID réel)
-- SELECT auth.uid() as current_user_id;

-- 4. Tester la requête exacte qui échoue
-- (à exécuter avec l'utilisateur connecté)
SELECT user_id 
FROM articles 
WHERE id = 'fce40443-4893-4e14-ba94-73d08020c722';

-- 5. Vérifier le total des articles
SELECT COUNT(*) as total_articles FROM articles;

-- 6. Vérifier les articles de l'utilisateur (remplacer par l'ID réel)
-- SELECT COUNT(*) as user_articles 
-- FROM articles 
-- WHERE user_id = 'USER_ID_ICI';

-- 7. Vérifier les permissions de l'utilisateur
SELECT 
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'articles' 
AND grantee = 'authenticated'; 