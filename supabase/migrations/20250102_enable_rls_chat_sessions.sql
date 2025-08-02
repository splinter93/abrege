-- Migration: Réactiver RLS sur chat_sessions avec les bonnes politiques
-- Date: 2025-01-02
-- Description: Réactiver RLS avec les politiques correctes pour la production

-- Réactiver RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;

-- Créer les nouvelles politiques RLS
-- Policy: Utilisateurs peuvent voir leurs propres sessions
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Utilisateurs peuvent créer leurs propres sessions
CREATE POLICY "Users can create own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Utilisateurs peuvent modifier leurs propres sessions
CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Utilisateurs peuvent supprimer leurs propres sessions
CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Commentaire pour documenter
COMMENT ON TABLE chat_sessions IS 'RLS activé avec politiques de sécurité pour la production'; 