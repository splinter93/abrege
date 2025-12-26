-- Script SQL pour tester le realtime canvas
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier que la table est dans la publication Realtime
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND schemaname = 'public' 
  AND tablename = 'canva_sessions';

-- Si pas de résultat, activer Realtime :
-- ALTER PUBLICATION supabase_realtime ADD TABLE canva_sessions;

-- 2. Vérifier les policies RLS
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
WHERE tablename = 'canva_sessions';

-- 3. Tester un UPDATE pour déclencher un événement
-- Remplace CHAT_SESSION_ID par ton chat_session_id
UPDATE canva_sessions 
SET title = 'Test realtime ' || NOW()::text
WHERE chat_session_id = '58f282c7-2c81-4ff6-9baa-6cab334bf328'
  AND user_id = '3223651c-5580-4471-affb-b3f4456bd729'
RETURNING id, title, status;

-- 4. Vérifier que l'utilisateur peut voir les canva_sessions
SELECT 
  id,
  chat_session_id,
  note_id,
  title,
  status,
  user_id
FROM canva_sessions 
WHERE chat_session_id = '58f282c7-2c81-4ff6-9baa-6cab334bf328'
  AND user_id = '3223651c-5580-4471-affb-b3f4456bd729';

