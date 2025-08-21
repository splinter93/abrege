-- MIGRATION: enable_realtime_articles
-- Description: Active le realtime Supabase sur la table articles pour les événements INSERT/UPDATE/DELETE
-- Date: 2025-01-31

-- 1. Activer REPLICA IDENTITY sur la table articles pour le realtime
-- Cela permet à Supabase de capturer les changements et de les envoyer via WebSocket
ALTER TABLE public.articles REPLICA IDENTITY FULL;

-- 2. Vérifier que la table est bien configurée pour le realtime
-- Note: REPLICA IDENTITY FULL capture toutes les colonnes avant/après modification
-- C'est nécessaire pour que les événements DELETE fonctionnent correctement

-- 3. Commentaire explicatif
COMMENT ON TABLE public.articles IS 'Table activée pour le realtime Supabase - REPLICA IDENTITY FULL activé';

-- 4. Vérification que la migration s'est bien appliquée
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'articles'
    AND n.nspname = 'public'
    AND c.relreplident = 'f'  -- 'f' = FULL
  ) THEN
    RAISE EXCEPTION 'REPLICA IDENTITY FULL non activé sur la table articles';
  END IF;
  
  RAISE NOTICE '✅ REPLICA IDENTITY FULL activé avec succès sur la table articles';
END $$; 