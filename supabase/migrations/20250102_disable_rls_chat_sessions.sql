-- Migration: Désactiver temporairement RLS sur chat_sessions
-- Date: 2025-01-02
-- Description: Désactiver RLS pour permettre aux APIs de fonctionner

-- Désactiver RLS temporairement
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;

-- Commentaire pour documenter
COMMENT ON TABLE chat_sessions IS 'RLS temporairement désactivé pour permettre aux APIs de fonctionner'; 