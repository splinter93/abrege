-- Migration: Fix slow session delete caused by trigger
-- Date: 2025-02-17
-- Description: Le trigger trim_chat_history ralentit les suppressions car il s'exécute même pour UPDATE is_active = false
--
-- PROBLÈME:
-- - Chaque UPDATE chat_sessions déclenche trim_chat_history()
-- - Ce trigger parse/trie/réorganise le JSONB thread (lourd !)
-- - Suppression optimiste devient lente (2-3s)
--
-- SOLUTION:
-- - Ajouter condition WHEN pour éviter exécution inutile
-- - Ne s'exécuter QUE si thread change ET session active

-- 1. Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS trim_chat_history_trigger ON chat_sessions;

-- 2. Recréer avec condition WHEN optimisée
CREATE TRIGGER trim_chat_history_trigger
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  WHEN (
    -- ✅ Exécuter SEULEMENT si:
    NEW.is_active = true                          -- Session encore active
    AND OLD.thread IS DISTINCT FROM NEW.thread    -- Thread a changé
  )
  EXECUTE FUNCTION trim_chat_history();

-- 3. Commentaire pour documentation
COMMENT ON TRIGGER trim_chat_history_trigger ON chat_sessions IS 
  'Tronque automatiquement l''historique si > history_limit. Optimisé pour ne pas ralentir les soft deletes.';

