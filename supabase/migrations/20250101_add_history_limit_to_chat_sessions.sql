-- Migration: Ajout de la colonne history_limit à chat_sessions
-- Date: 2025-01-01
-- Description: Contrôle du nombre de messages dans l'historique

-- Ajouter la colonne history_limit avec une valeur par défaut de 10
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS history_limit INTEGER NOT NULL DEFAULT 10;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN chat_sessions.history_limit IS 'Nombre maximum de messages à inclure dans l''historique pour l''API Synesia';

-- Index pour optimiser les requêtes avec history_limit
CREATE INDEX IF NOT EXISTS idx_chat_sessions_history_limit ON chat_sessions(user_id, history_limit);

-- Fonction pour nettoyer automatiquement l'historique selon la limite
CREATE OR REPLACE FUNCTION trim_chat_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le thread dépasse la limite, garder seulement les derniers messages
  IF jsonb_array_length(NEW.thread) > NEW.history_limit THEN
    NEW.thread := (
      SELECT jsonb_agg(message)
      FROM (
        SELECT message
        FROM jsonb_array_elements(NEW.thread) AS message
        ORDER BY (message->>'timestamp')::timestamp DESC
        LIMIT NEW.history_limit
      ) AS recent_messages
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour automatiquement tronquer l'historique
CREATE TRIGGER trim_chat_history_trigger
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trim_chat_history(); 