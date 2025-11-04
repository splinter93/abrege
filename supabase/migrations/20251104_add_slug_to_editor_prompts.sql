-- Migration: Ajout de la colonne slug pour mentions /slug dans chat
-- Date: 2025-11-04
-- Description: Ajoute slug unique par user pour permettre mentions /slug (comme @slug pour notes)
-- Conformité: GUIDE-EXCELLENCE-CODE.md

-- 1. Ajouter colonne slug (nullable temporairement pour migration)
ALTER TABLE editor_prompts
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Fonction helper pour générer slug depuis name
CREATE OR REPLACE FUNCTION generate_slug_from_name(name_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(name_text, '[éèêë]', 'e', 'g'),
                '[àâä]', 'a', 'g'
              ),
              '[îï]', 'i', 'g'
            ),
            '[ôö]', 'o', 'g'
          ),
          '[ùûü]', 'u', 'g'
        ),
        '[ç]', 'c', 'g'
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Générer slugs pour tous les prompts existants
-- Gérer les doublons avec suffixe numérique
DO $$
DECLARE
  prompt_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
  user_prompts CURSOR FOR 
    SELECT id, user_id, name FROM editor_prompts WHERE slug IS NULL ORDER BY created_at;
BEGIN
  FOR prompt_record IN user_prompts LOOP
    base_slug = generate_slug_from_name(prompt_record.name);
    
    -- Limiter longueur à 50 caractères
    IF length(base_slug) > 50 THEN
      base_slug = substring(base_slug, 1, 50);
    END IF;
    
    -- Chercher un slug unique avec suffixe si nécessaire
    final_slug = base_slug;
    counter = 1;
    
    WHILE EXISTS (
      SELECT 1 FROM editor_prompts 
      WHERE user_id = prompt_record.user_id 
        AND slug = final_slug 
        AND id != prompt_record.id
    ) LOOP
      final_slug = base_slug || '-' || counter;
      counter = counter + 1;
      
      -- Protection contre boucle infinie
      IF counter > 100 THEN
        -- Fallback: utiliser UUID partiel
        final_slug = base_slug || '-' || substring(prompt_record.id::text, 1, 8);
        EXIT;
      END IF;
    END LOOP;
    
    -- Mettre à jour le prompt
    UPDATE editor_prompts
    SET slug = final_slug
    WHERE id = prompt_record.id;
    
  END LOOP;
END $$;

-- 4. Rendre slug NOT NULL + UNIQUE par user
ALTER TABLE editor_prompts
ALTER COLUMN slug SET NOT NULL,
ADD CONSTRAINT editor_prompts_user_slug_key UNIQUE(user_id, slug);

-- 5. Index pour recherche rapide par slug
CREATE INDEX IF NOT EXISTS idx_editor_prompts_user_slug 
ON editor_prompts(user_id, slug);

-- 6. Index pour recherche globale par slug (si besoin)
CREATE INDEX IF NOT EXISTS idx_editor_prompts_slug 
ON editor_prompts(slug);

-- 7. Mettre à jour la fonction trigger pour inclure slug
CREATE OR REPLACE FUNCTION create_default_editor_prompts_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  system_agent_id UUID;
BEGIN
  -- Récupérer l'ID de l'agent système
  SELECT id INTO system_agent_id FROM agents WHERE name = 'Editor Assistant' LIMIT 1;

  -- Créer les 8 prompts par défaut avec slugs
  INSERT INTO editor_prompts (user_id, agent_id, name, slug, description, prompt_template, icon, position, is_active, is_default, category, context)
  VALUES
    (NEW.id, system_agent_id, 'Améliorer l''écriture', 'ameliorer-lecriture', 'Rend le texte plus clair, professionnel et percutant', 'Améliore ce texte en le rendant plus clair et professionnel : {selection}', 'FiTrendingUp', 1, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Corriger l''orthographe', 'corriger-lorthographe', 'Corrige les fautes d''orthographe et de grammaire', 'Corrige l''orthographe et la grammaire de ce texte : {selection}', 'FiCheckCircle', 2, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Simplifier', 'simplifier', 'Simplifie le texte pour le rendre plus accessible', 'Simplifie ce texte pour le rendre plus accessible et facile à comprendre : {selection}', 'FiEdit3', 3, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Développer', 'developper', 'Enrichit le texte avec plus de détails', 'Développe et enrichis ce texte avec plus de détails et d''explications : {selection}', 'FiMessageSquare', 4, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Résumer', 'resumer', 'Résume le texte de manière concise', 'Résume ce texte de manière concise en gardant les points essentiels : {selection}', 'FiList', 5, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Traduire en anglais', 'traduire-en-anglais', 'Traduit le texte en anglais', 'Traduis ce texte en anglais : {selection}', 'FiGlobe', 6, true, true, 'translate', 'both'),
    (NEW.id, system_agent_id, 'Expliquer', 'expliquer', 'Explique le concept de manière simple', 'Explique ce concept de manière simple et claire : {selection}', 'FiAlertCircle', 7, true, true, 'writing', 'both'),
    (NEW.id, system_agent_id, 'Générer du code', 'generer-du-code', 'Génère du code basé sur la description', 'Génère du code propre et commenté basé sur cette description : {selection}', 'FiCode', 8, true, true, 'code', 'editor');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Commentaire explicatif
COMMENT ON COLUMN editor_prompts.slug IS 'Slug unique du prompt par user (pour mentions /slug dans chat, format: kebab-case)';

