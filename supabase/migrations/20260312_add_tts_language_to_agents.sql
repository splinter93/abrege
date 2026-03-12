-- Ajouter la colonne tts_language à la table agents
-- Valeur par défaut 'en', nullable pour les agents existants
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tts_language TEXT DEFAULT 'en';
