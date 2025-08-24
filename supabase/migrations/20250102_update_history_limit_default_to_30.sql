-- Migration: Mise à jour de la valeur par défaut de history_limit à 30
-- Date: 2025-01-02
-- Description: Augmentation de la limite d'historique par défaut de 10 à 30 messages

-- Mettre à jour la valeur par défaut pour les nouvelles sessions
ALTER TABLE chat_sessions 
ALTER COLUMN history_limit SET DEFAULT 30;

-- Mettre à jour les sessions existantes qui ont encore la valeur par défaut de 10
UPDATE chat_sessions 
SET history_limit = 30 
WHERE history_limit = 10;

-- Mettre à jour le commentaire de la colonne
COMMENT ON COLUMN chat_sessions.history_limit IS 'Nombre maximum de messages à inclure dans l''historique pour l''API Synesia (défaut: 30)';

-- Vérifier que la fonction trim_chat_history fonctionne toujours correctement
-- (pas de modification nécessaire car elle utilise NEW.history_limit dynamiquement) 