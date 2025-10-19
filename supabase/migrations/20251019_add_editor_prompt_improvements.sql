-- Migration: Améliorations des prompts éditeur
-- Date: 2025-10-19
-- Features:
-- 1. Mode d'insertion flexible (replace, append, prepend)
-- 2. Structured outputs pour éviter les phrases parasites

-- Ajouter la colonne insertion_mode
ALTER TABLE editor_prompts
ADD COLUMN IF NOT EXISTS insertion_mode TEXT NOT NULL DEFAULT 'replace'
CHECK (insertion_mode IN ('replace', 'append', 'prepend'));

-- Ajouter la colonne use_structured_output
ALTER TABLE editor_prompts
ADD COLUMN IF NOT EXISTS use_structured_output BOOLEAN NOT NULL DEFAULT false;

-- Ajouter la colonne output_schema (JSON)
ALTER TABLE editor_prompts
ADD COLUMN IF NOT EXISTS output_schema JSONB;

-- Commenter les colonnes
COMMENT ON COLUMN editor_prompts.insertion_mode IS 'Mode d''insertion du contenu généré : replace (remplace la sélection), append (ajoute après), prepend (ajoute avant)';
COMMENT ON COLUMN editor_prompts.use_structured_output IS 'Utiliser les structured outputs pour éviter les phrases parasites du LLM';
COMMENT ON COLUMN editor_prompts.output_schema IS 'Schéma JSON pour les structured outputs (format OpenAPI)';

-- Créer un index pour les requêtes filtrées par insertion_mode
CREATE INDEX IF NOT EXISTS idx_editor_prompts_insertion_mode ON editor_prompts(insertion_mode);

-- Créer un index pour les prompts avec structured output
CREATE INDEX IF NOT EXISTS idx_editor_prompts_structured ON editor_prompts(use_structured_output) WHERE use_structured_output = true;

-- Exemple de mise à jour des prompts existants (optionnel)
-- Les prompts de type "développer", "expliquer", "continuer" doivent être en mode append
UPDATE editor_prompts
SET insertion_mode = 'append'
WHERE 
  (LOWER(name) LIKE '%développer%'
  OR LOWER(name) LIKE '%expliquer%'
  OR LOWER(name) LIKE '%continuer%'
  OR LOWER(name) LIKE '%détailler%'
  OR LOWER(name) LIKE '%compléter%')
  AND insertion_mode = 'replace';

-- Activer structured outputs pour les prompts de correction/reformulation
UPDATE editor_prompts
SET 
  use_structured_output = true,
  output_schema = jsonb_build_object(
    'type', 'object',
    'properties', jsonb_build_object(
      'content', jsonb_build_object(
        'type', 'string',
        'description', 'Le contenu demandé, sans phrase d''introduction ni explication'
      )
    ),
    'required', jsonb_build_array('content')
  )
WHERE 
  (LOWER(name) LIKE '%corriger%'
  OR LOWER(name) LIKE '%reformuler%'
  OR LOWER(name) LIKE '%raccourcir%'
  OR LOWER(name) LIKE '%simplifier%'
  OR LOWER(name) LIKE '%traduire%')
  AND use_structured_output = false;

