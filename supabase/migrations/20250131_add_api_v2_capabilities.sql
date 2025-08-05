-- Migration: Ajout des capacités API v2 pour les agents
-- Date: 2025-01-31
-- Description: Ajout de la colonne api_v2_capabilities pour permettre aux agents d'utiliser l'API v2

-- Ajouter la colonne api_v2_capabilities
ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_v2_capabilities TEXT[] DEFAULT '{}';

-- Ajouter un index pour les performances
CREATE INDEX IF NOT EXISTS idx_agents_api_v2_capabilities ON agents USING gin(api_v2_capabilities);

-- Commentaire pour documentation
COMMENT ON COLUMN agents.api_v2_capabilities IS 'Liste des capacités API v2 disponibles pour l''agent (ex: create_note, update_note, etc.)';

-- Mettre à jour les agents existants avec des capacités par défaut
UPDATE agents 
SET api_v2_capabilities = ARRAY['create_note', 'update_note', 'add_content_to_note', 'move_note', 'delete_note', 'create_folder']
WHERE api_v2_capabilities IS NULL OR array_length(api_v2_capabilities, 1) IS NULL; 