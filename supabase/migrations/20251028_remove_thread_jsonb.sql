-- Migration: Suppression thread JSONB et history_limit
-- Date: 28 octobre 2025
-- Description: Fresh start - suppression complète du système legacy

-- 1. Suppression colonne thread JSONB (violation standards)
ALTER TABLE chat_sessions DROP COLUMN IF EXISTS thread;

-- 2. Suppression colonne history_limit (obsolète)
ALTER TABLE chat_sessions DROP COLUMN IF EXISTS history_limit;

-- 3. Suppression trigger auto-trim (obsolète)
DROP TRIGGER IF EXISTS trim_chat_history_trigger ON chat_sessions;

-- 4. Suppression fonction trim_chat_history (obsolète)
DROP FUNCTION IF EXISTS trim_chat_history();

-- 5. Commentaire table
COMMENT ON TABLE chat_sessions IS 'Sessions de chat - Messages stockés dans chat_messages avec sequence_number atomique';

-- 6. Vérification structure finale
DO $$
BEGIN
  -- Vérifier que thread n'existe plus
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'chat_sessions' 
      AND column_name = 'thread'
      AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Colonne thread existe encore après suppression';
  END IF;

  -- Vérifier que history_limit n'existe plus
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'chat_sessions' 
      AND column_name = 'history_limit'
      AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Colonne history_limit existe encore après suppression';
  END IF;

  RAISE NOTICE '✅ Migration réussie: thread et history_limit supprimés';
END $$;

