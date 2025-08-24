-- Migration: Suppression de la troncature automatique de l'historique
-- Date: 2025-01-02
-- Description: Permettre de garder TOUS les messages dans l'historique pour l'utilisateur

-- Supprimer le trigger de troncature automatique
DROP TRIGGER IF EXISTS trim_chat_history_trigger ON chat_sessions;

-- Supprimer la fonction de troncature
DROP FUNCTION IF EXISTS trim_chat_history();

-- Mettre à jour le commentaire pour clarifier l'usage
COMMENT ON COLUMN chat_sessions.history_limit IS 'Nombre maximum de messages à inclure dans l''historique pour l''API Synesia uniquement (l''affichage utilisateur n''est pas limité)';

-- Ajouter un commentaire sur la table pour clarifier
COMMENT ON TABLE chat_sessions IS 'Sessions de chat avec historique complet conservé (pas de troncature automatique)'; 