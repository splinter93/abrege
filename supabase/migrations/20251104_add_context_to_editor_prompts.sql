-- Migration: Ajout de la colonne context pour différencier prompts éditeur/chat
-- Date: 2025-11-04
-- Description: Ajoute la colonne context ('editor' | 'chat' | 'both') pour filtrer les prompts selon leur usage

-- 1. Ajouter la colonne context avec valeur par défaut 'editor'
ALTER TABLE editor_prompts
ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT 'editor'
CHECK (context IN ('editor', 'chat', 'both'));

-- 2. Créer un index pour optimiser les filtres par contexte
CREATE INDEX IF NOT EXISTS idx_editor_prompts_context 
ON editor_prompts(user_id, context, is_active);

-- 3. Mettre à jour les prompts par défaut existants
-- Les prompts d'écriture/édition sont utiles dans l'éditeur ET le chat
UPDATE editor_prompts
SET context = 'both'
WHERE is_default = true
  AND name IN (
    'Améliorer l''écriture',
    'Corriger l''orthographe',
    'Simplifier',
    'Développer',
    'Résumer',
    'Traduire en anglais',
    'Expliquer'
  );

-- Les prompts de code restent uniquement pour l'éditeur
UPDATE editor_prompts
SET context = 'editor'
WHERE is_default = true
  AND name = 'Générer du code';

-- 4. Mettre à jour la fonction trigger pour inclure le contexte dans les nouveaux prompts
CREATE OR REPLACE FUNCTION create_default_editor_prompts_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  system_agent_id UUID;
BEGIN
  -- Récupérer l'ID de l'agent système
  SELECT id INTO system_agent_id FROM agents WHERE name = 'Editor Assistant' LIMIT 1;

  -- Créer les 8 prompts par défaut pour le nouvel utilisateur avec le bon contexte
  INSERT INTO editor_prompts (user_id, agent_id, name, description, prompt_template, icon, position, is_active, is_default, category, context)
  VALUES
    (NEW.id, system_agent_id, 'Améliorer l''écriture', 'Rend le texte plus clair, professionnel et percutant', 'Améliore ce texte en le rendant plus clair et professionnel : {selection}', 'FiTrendingUp', 1, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Corriger l''orthographe', 'Corrige les fautes d''orthographe et de grammaire', 'Corrige l''orthographe et la grammaire de ce texte : {selection}', 'FiCheckCircle', 2, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Simplifier', 'Simplifie le texte pour le rendre plus accessible', 'Simplifie ce texte pour le rendre plus accessible et facile à comprendre : {selection}', 'FiEdit3', 3, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Développer', 'Enrichit le texte avec plus de détails', 'Développe et enrichis ce texte avec plus de détails et d''explications : {selection}', 'FiMessageSquare', 4, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Résumer', 'Résume le texte de manière concise', 'Résume ce texte de manière concise en gardant les points essentiels : {selection}', 'FiList', 5, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Traduire en anglais', 'Traduit le texte en anglais', 'Traduis ce texte en anglais : {selection}', 'FiGlobe', 6, true, true, 'translate', 'both'),
    (NEW.id, system_agent_id, 'Expliquer', 'Explique le concept de manière simple', 'Explique ce concept de manière simple et claire : {selection}', 'FiAlertCircle', 7, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Générer du code', 'Génère du code basé sur la description', 'Génère du code propre et commenté basé sur cette description : {selection}', 'FiCode', 8, true, true, 'code', 'editor');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire explicatif
COMMENT ON COLUMN editor_prompts.context IS 'Contexte d''utilisation du prompt: editor (éditeur uniquement), chat (chat uniquement), ou both (les deux)';

