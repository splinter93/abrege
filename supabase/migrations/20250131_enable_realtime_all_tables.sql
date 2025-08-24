-- MIGRATION: enable_realtime_all_tables
-- Description: Active le realtime Supabase sur TOUTES les tables pour capturer INSERT/UPDATE/DELETE
-- Date: 2025-01-31

-- 1. Activer REPLICA IDENTITY FULL sur la table notes (articles)
-- Cela permet à Supabase de capturer les changements et de les envoyer via WebSocket
ALTER TABLE public.articles REPLICA IDENTITY FULL;

-- 2. Activer REPLICA IDENTITY FULL sur la table folders
ALTER TABLE public.folders REPLICA IDENTITY FULL;

-- 3. Activer REPLICA IDENTITY FULL sur la table classeurs (notebooks)
ALTER TABLE public.classeurs REPLICA IDENTITY FULL;

-- 4. Vérifier que toutes les tables sont bien configurées pour le realtime
-- Note: REPLICA IDENTITY FULL capture toutes les colonnes avant/après modification
-- C'est nécessaire pour que les événements DELETE fonctionnent correctement

-- 5. Commentaires explicatifs
COMMENT ON TABLE public.articles IS 'Table activée pour le realtime Supabase - REPLICA IDENTITY FULL activé';
COMMENT ON TABLE public.folders IS 'Table activée pour le realtime Supabase - REPLICA IDENTITY FULL activé';
COMMENT ON TABLE public.classeurs IS 'Table activée pour le realtime Supabase - REPLICA IDENTITY FULL activé';

-- 6. Vérification que la migration s'est bien appliquée
DO $$
BEGIN
  -- Vérifier articles
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'articles'
    AND n.nspname = 'public'
    AND c.relreplident = 'f'  -- 'f' = FULL
  ) THEN
    RAISE EXCEPTION 'REPLICA IDENTITY FULL non activé sur la table articles';
  END IF;
  
  -- Vérifier folders
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'folders'
    AND n.nspname = 'public'
    AND c.relreplident = 'f'  -- 'f' = FULL
  ) THEN
    RAISE EXCEPTION 'REPLICA IDENTITY FULL non activé sur la table folders';
  END IF;
  
  -- Vérifier classeurs
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'classeurs'
    AND n.nspname = 'public'
    AND c.relreplident = 'f'  -- 'f' = FULL
  ) THEN
    RAISE EXCEPTION 'REPLICA IDENTITY FULL non activé sur la table classeurs';
  END IF;
  
  RAISE NOTICE '✅ REPLICA IDENTITY FULL activé avec succès sur toutes les tables (articles, folders, classeurs)';
END $$; 