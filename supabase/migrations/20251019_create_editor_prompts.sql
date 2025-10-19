-- Migration: Création du système de prompts éditeur personnalisables
-- Date: 2025-10-19
-- Description: Table editor_prompts + agent système + seed 8 prompts par défaut

-- 1. Création de la table editor_prompts
CREATE TABLE IF NOT EXISTS editor_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  description TEXT,
  prompt_template TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'FiZap',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index pour performances
CREATE INDEX IF NOT EXISTS idx_editor_prompts_user_id ON editor_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_editor_prompts_agent_id ON editor_prompts(agent_id);
CREATE INDEX IF NOT EXISTS idx_editor_prompts_position ON editor_prompts(user_id, position);
CREATE INDEX IF NOT EXISTS idx_editor_prompts_is_active ON editor_prompts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_editor_prompts_category ON editor_prompts(category);

-- 3. RLS Policies
ALTER TABLE editor_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres prompts
CREATE POLICY "Users can view own editor prompts" ON editor_prompts
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres prompts
CREATE POLICY "Users can create own editor prompts" ON editor_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent modifier leurs propres prompts
CREATE POLICY "Users can update own editor prompts" ON editor_prompts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres prompts
CREATE POLICY "Users can delete own editor prompts" ON editor_prompts
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Service role peut tout faire
CREATE POLICY "Service role can access all editor prompts" ON editor_prompts
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Trigger pour updated_at
CREATE TRIGGER update_editor_prompts_updated_at 
  BEFORE UPDATE ON editor_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Commentaires pour documentation
COMMENT ON TABLE editor_prompts IS 'Prompts personnalisables pour les actions IA de l''éditeur';
COMMENT ON COLUMN editor_prompts.user_id IS 'Propriétaire du prompt';
COMMENT ON COLUMN editor_prompts.agent_id IS 'Agent spécialisé qui exécutera le prompt (nullable avec fallback)';
COMMENT ON COLUMN editor_prompts.name IS 'Nom du prompt (ex: Améliorer l''écriture)';
COMMENT ON COLUMN editor_prompts.description IS 'Description optionnelle du prompt';
COMMENT ON COLUMN editor_prompts.prompt_template IS 'Template du prompt avec placeholder {selection}';
COMMENT ON COLUMN editor_prompts.icon IS 'Nom de l''icône React Icons (ex: FiTrendingUp)';
COMMENT ON COLUMN editor_prompts.position IS 'Ordre d''affichage dans le menu';
COMMENT ON COLUMN editor_prompts.is_active IS 'Si le prompt est actif (soft delete)';
COMMENT ON COLUMN editor_prompts.is_default IS 'Si c''est un prompt système par défaut';
COMMENT ON COLUMN editor_prompts.category IS 'Catégorie du prompt (writing, code, translate, etc.)';

-- 6. Créer l'agent système "Editor Assistant"
DO $$
DECLARE
  system_agent_id UUID;
BEGIN
  -- Créer l'agent système pour les prompts par défaut
  INSERT INTO agents (
    name,
    provider,
    model,
    temperature,
    top_p,
    max_tokens,
    is_active,
    is_endpoint_agent,
    is_default,
    system_instructions,
    personality,
    expertise,
    capabilities,
    api_v2_capabilities,
    priority,
    version
  ) VALUES (
    'Editor Assistant',
    'groq',
    'openai/gpt-oss-120b',
    0.7,
    1.0,
    4000,
    true,
    false,
    true,
    'Tu es un assistant éditeur spécialisé dans l''amélioration et la transformation de textes. Tu réponds de manière concise et directe en fournissant uniquement le texte transformé, sans explications supplémentaires sauf si demandé.',
    'Assistant éditeur professionnel, précis et efficace',
    ARRAY['writing', 'editing', 'grammar', 'translation', 'summarization'],
    '["text", "editing", "translation"]'::jsonb,
    ARRAY['create_note', 'update_note', 'search_notes'],
    100,
    '1.0.0'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO system_agent_id;

  -- Si l'agent existe déjà, récupérer son ID
  IF system_agent_id IS NULL THEN
    SELECT id INTO system_agent_id FROM agents WHERE name = 'Editor Assistant' LIMIT 1;
  END IF;

  -- 7. Seed des 8 prompts par défaut pour chaque utilisateur existant
  -- Ces prompts seront créés pour chaque nouvel utilisateur via un trigger
  INSERT INTO editor_prompts (user_id, agent_id, name, description, prompt_template, icon, position, is_active, is_default, category)
  SELECT 
    u.id as user_id,
    system_agent_id as agent_id,
    prompt.name,
    prompt.description,
    prompt.prompt_template,
    prompt.icon,
    prompt.position,
    true as is_active,
    true as is_default,
    prompt.category
  FROM auth.users u
  CROSS JOIN (
    VALUES
      ('Améliorer l''écriture', 'Rend le texte plus clair, professionnel et percutant', 'Améliore ce texte en le rendant plus clair et professionnel : {selection}', 'FiTrendingUp', 1, 'writing'),
      ('Corriger l''orthographe', 'Corrige les fautes d''orthographe et de grammaire', 'Corrige l''orthographe et la grammaire de ce texte : {selection}', 'FiCheckCircle', 2, 'writing'),
      ('Simplifier', 'Simplifie le texte pour le rendre plus accessible', 'Simplifie ce texte pour le rendre plus accessible et facile à comprendre : {selection}', 'FiEdit3', 3, 'writing'),
      ('Développer', 'Enrichit le texte avec plus de détails', 'Développe et enrichis ce texte avec plus de détails et d''explications : {selection}', 'FiMessageSquare', 4, 'writing'),
      ('Résumer', 'Résume le texte de manière concise', 'Résume ce texte de manière concise en gardant les points essentiels : {selection}', 'FiList', 5, 'writing'),
      ('Traduire en anglais', 'Traduit le texte en anglais', 'Traduis ce texte en anglais : {selection}', 'FiGlobe', 6, 'translate'),
      ('Expliquer', 'Explique le concept de manière simple', 'Explique ce concept de manière simple et claire : {selection}', 'FiAlertCircle', 7, 'writing'),
      ('Générer du code', 'Génère du code basé sur la description', 'Génère du code propre et commenté basé sur cette description : {selection}', 'FiCode', 8, 'code')
  ) AS prompt(name, description, prompt_template, icon, position, category)
  ON CONFLICT DO NOTHING;

END $$;

-- 8. Fonction trigger pour créer les prompts par défaut pour les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION create_default_editor_prompts_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  system_agent_id UUID;
BEGIN
  -- Récupérer l'ID de l'agent système
  SELECT id INTO system_agent_id FROM agents WHERE name = 'Editor Assistant' LIMIT 1;

  -- Créer les 8 prompts par défaut pour le nouvel utilisateur
  INSERT INTO editor_prompts (user_id, agent_id, name, description, prompt_template, icon, position, is_active, is_default, category)
  VALUES
    (NEW.id, system_agent_id, 'Améliorer l''écriture', 'Rend le texte plus clair, professionnel et percutant', 'Améliore ce texte en le rendant plus clair et professionnel : {selection}', 'FiTrendingUp', 1, true, true, 'writing'),
    (NEW.id, system_agent_id, 'Corriger l''orthographe', 'Corrige les fautes d''orthographe et de grammaire', 'Corrige l''orthographe et la grammaire de ce texte : {selection}', 'FiCheckCircle', 2, true, true, 'writing'),
    (NEW.id, system_agent_id, 'Simplifier', 'Simplifie le texte pour le rendre plus accessible', 'Simplifie ce texte pour le rendre plus accessible et facile à comprendre : {selection}', 'FiEdit3', 3, true, true, 'writing'),
    (NEW.id, system_agent_id, 'Développer', 'Enrichit le texte avec plus de détails', 'Développe et enrichis ce texte avec plus de détails et d''explications : {selection}', 'FiMessageSquare', 4, true, true, 'writing'),
    (NEW.id, system_agent_id, 'Résumer', 'Résume le texte de manière concise', 'Résume ce texte de manière concise en gardant les points essentiels : {selection}', 'FiList', 5, true, true, 'writing'),
    (NEW.id, system_agent_id, 'Traduire en anglais', 'Traduit le texte en anglais', 'Traduis ce texte en anglais : {selection}', 'FiGlobe', 6, true, true, 'translate'),
    (NEW.id, system_agent_id, 'Expliquer', 'Explique le concept de manière simple', 'Explique ce concept de manière simple et claire : {selection}', 'FiAlertCircle', 7, true, true, 'writing'),
    (NEW.id, system_agent_id, 'Générer du code', 'Génère du code basé sur la description', 'Génère du code propre et commenté basé sur cette description : {selection}', 'FiCode', 8, true, true, 'code');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Créer le trigger sur auth.users pour les nouveaux utilisateurs
DROP TRIGGER IF EXISTS create_default_editor_prompts_trigger ON auth.users;
CREATE TRIGGER create_default_editor_prompts_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_editor_prompts_for_new_user();


