-- Migration: Ajout de profile_picture à la table agents
-- Date: 2025-10-10
-- Description: Ajout de la colonne manquante pour les avatars d'agents

-- Ajouter la colonne profile_picture
ALTER TABLE agents ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Commentaire pour documentation
COMMENT ON COLUMN agents.profile_picture IS 'URL de l''image de profil de l''agent (emoji ou URL d''image)';

-- Mettre à jour les agents existants avec des emojis par défaut
UPDATE agents 
SET profile_picture = '🤖'
WHERE profile_picture IS NULL AND is_endpoint_agent = true;

UPDATE agents 
SET profile_picture = '💬'
WHERE profile_picture IS NULL AND is_chat_agent = true;

