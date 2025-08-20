-- Migration: Création du système de plans d'abonnement
-- Date: 2025-01-31
-- Description: Système de quotas dynamiques basé sur les abonnements utilisateur

-- ========================================
-- 1. TABLE DES PLANS D'ABONNEMENT
-- ========================================

-- Enum pour les types de plans
CREATE TYPE subscription_plan_type AS ENUM (
  'free',
  'basic', 
  'premium',
  'enterprise',
  'custom'
);

-- Table des plans d'abonnement
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type subscription_plan_type NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Quotas de stockage (en octets)
  storage_quota_bytes BIGINT NOT NULL CHECK (storage_quota_bytes > 0),
  
  -- Limites par fichier
  max_file_size_bytes BIGINT NOT NULL CHECK (max_file_size_bytes > 0),
  max_files_per_upload INTEGER NOT NULL CHECK (max_files_per_upload > 0),
  
  -- Fonctionnalités
  features JSONB DEFAULT '{}',
  
  -- Prix et facturation
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. TABLE DES ABONNEMENTS UTILISATEUR
-- ========================================

-- Table des abonnements actifs des utilisateurs
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  
  -- Statut de l'abonnement
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')) DEFAULT 'active',
  
  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  -- Informations de facturation
  billing_provider TEXT, -- 'stripe', 'paypal', 'manual', etc.
  external_subscription_id TEXT,
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  UNIQUE(user_id, plan_id),
  CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > started_at)
);

-- ========================================
-- 3. MISE À JOUR DE LA TABLE STORAGE_USAGE
-- ========================================

-- Ajouter une colonne pour le plan d'abonnement actuel
ALTER TABLE storage_usage 
ADD COLUMN IF NOT EXISTS current_plan_id UUID REFERENCES subscription_plans(id),
ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ DEFAULT NOW();

-- ========================================
-- 4. INDEXES POUR PERFORMANCE
-- ========================================

-- Index pour les plans actifs
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active 
ON subscription_plans (is_active, is_default) 
WHERE is_active = true;

-- Index pour les abonnements utilisateur
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status 
ON user_subscriptions (user_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expiry 
ON user_subscriptions (expires_at) 
WHERE expires_at IS NOT NULL;

-- Index pour storage_usage avec plan
CREATE INDEX IF NOT EXISTS idx_storage_usage_plan 
ON storage_usage (current_plan_id) 
WHERE current_plan_id IS NOT NULL;

-- ========================================
-- 5. TRIGGERS AUTOMATIQUES
-- ========================================

-- Trigger pour updated_at sur subscription_plans
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Trigger pour updated_at sur user_subscriptions
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Trigger pour synchroniser storage_usage avec le plan
CREATE OR REPLACE FUNCTION sync_storage_usage_with_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour storage_usage avec le nouveau plan
  UPDATE storage_usage 
  SET 
    quota_bytes = (SELECT storage_quota_bytes FROM subscription_plans WHERE id = NEW.plan_id),
    current_plan_id = NEW.plan_id,
    plan_updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_storage_usage_on_subscription_change
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION sync_storage_usage_with_plan();

-- ========================================
-- 6. FONCTIONS UTILITAIRES
-- ========================================

-- Fonction pour obtenir le plan actif d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_active_plan(user_uuid UUID)
RETURNS TABLE (
  plan_id UUID,
  plan_name TEXT,
  plan_type subscription_plan_type,
  storage_quota_bytes BIGINT,
  max_file_size_bytes BIGINT,
  max_files_per_upload INTEGER,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.name,
    sp.type,
    sp.storage_quota_bytes,
    sp.max_file_size_bytes,
    sp.max_files_per_upload,
    sp.features
  FROM subscription_plans sp
  INNER JOIN user_subscriptions us ON sp.id = us.plan_id
  WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > NOW())
  ORDER BY us.started_at DESC
  LIMIT 1;
  
  -- Si aucun abonnement actif, retourner le plan par défaut
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      sp.id,
      sp.name,
      sp.type,
      sp.storage_quota_bytes,
      sp.max_file_size_bytes,
      sp.max_files_per_upload,
      sp.features
    FROM subscription_plans sp
    WHERE sp.is_default = true AND sp.is_active = true
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour les quotas d'un utilisateur selon son plan
CREATE OR REPLACE FUNCTION update_user_quota_from_plan(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  plan_data RECORD;
BEGIN
  -- Récupérer le plan actif
  SELECT * INTO plan_data FROM get_user_active_plan(user_uuid);
  
  IF plan_data.plan_id IS NOT NULL THEN
    -- Mettre à jour storage_usage
    UPDATE storage_usage 
    SET 
      quota_bytes = plan_data.storage_quota_bytes,
      current_plan_id = plan_data.plan_id,
      plan_updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Créer l'entrée si elle n'existe pas
    IF NOT FOUND THEN
      INSERT INTO storage_usage (user_id, used_bytes, quota_bytes, current_plan_id, plan_updated_at)
      VALUES (user_uuid, 0, plan_data.storage_quota_bytes, plan_data.plan_id, NOW());
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. RLS (ROW LEVEL SECURITY)
-- ========================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Politiques pour subscription_plans (lecture publique, écriture admin)
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can modify subscription plans" ON subscription_plans
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Politiques pour user_subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can modify user subscriptions" ON user_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- 8. DONNÉES INITIALES
-- ========================================

-- Insérer les plans par défaut
INSERT INTO subscription_plans (name, type, display_name, description, storage_quota_bytes, max_file_size_bytes, max_files_per_upload, features, is_default, is_active) VALUES
(
  'free',
  'free',
  'Gratuit',
  'Plan gratuit avec fonctionnalités de base',
  1073741824, -- 1 GB
  26214400,   -- 25 MB
  5,          -- 5 fichiers max
  '{"ai_chat": false, "priority_support": false, "advanced_features": false}'::jsonb,
  true,
  true
),
(
  'basic',
  'basic', 
  'Basique',
  'Plan basique pour utilisateurs occasionnels',
  5368709120, -- 5 GB
  52428800,   -- 50 MB
  10,         -- 10 fichiers max
  '{"ai_chat": true, "priority_support": false, "advanced_features": false}'::jsonb,
  false,
  true
),
(
  'premium',
  'premium',
  'Premium',
  'Plan premium pour utilisateurs réguliers',
  21474836480, -- 20 GB
  104857600,   -- 100 MB
  20,          -- 20 fichiers max
  '{"ai_chat": true, "priority_support": true, "advanced_features": true}'::jsonb,
  false,
  true
),
(
  'enterprise',
  'enterprise',
  'Entreprise',
  'Plan entreprise pour équipes et organisations',
  107374182400, -- 100 GB
  524288000,    -- 500 MB
  50,           -- 50 fichiers max
  '{"ai_chat": true, "priority_support": true, "advanced_features": true, "team_features": true, "api_access": true}'::jsonb,
  false,
  true
)
ON CONFLICT (name) DO UPDATE SET
  storage_quota_bytes = EXCLUDED.storage_quota_bytes,
  max_file_size_bytes = EXCLUDED.max_file_size_bytes,
  max_files_per_upload = EXCLUDED.max_files_per_upload,
  features = EXCLUDED.features,
  updated_at = NOW();

-- ========================================
-- 9. MIGRATION DES DONNÉES EXISTANTES
-- ========================================

-- Mettre à jour storage_usage existant avec le plan gratuit
UPDATE storage_usage 
SET 
  current_plan_id = (SELECT id FROM subscription_plans WHERE name = 'free'),
  plan_updated_at = NOW()
WHERE current_plan_id IS NULL;

-- Créer des abonnements gratuits pour tous les utilisateurs existants
INSERT INTO user_subscriptions (user_id, plan_id, status, started_at)
SELECT 
  user_id,
  (SELECT id FROM subscription_plans WHERE name = 'free'),
  'active',
  NOW()
FROM storage_usage
ON CONFLICT (user_id, plan_id) DO NOTHING;

-- ========================================
-- 10. COMMENTAIRES ET DOCUMENTATION
-- ========================================

COMMENT ON TABLE subscription_plans IS 'Plans d''abonnement disponibles avec leurs quotas et fonctionnalités';
COMMENT ON TABLE user_subscriptions IS 'Abonnements actifs des utilisateurs avec dates et statuts';
COMMENT ON COLUMN subscription_plans.storage_quota_bytes IS 'Quota de stockage en octets pour ce plan';
COMMENT ON COLUMN subscription_plans.max_file_size_bytes IS 'Taille maximale par fichier en octets';
COMMENT ON COLUMN subscription_plans.max_files_per_upload IS 'Nombre maximum de fichiers par upload';
COMMENT ON COLUMN user_subscriptions.status IS 'Statut de l''abonnement: active, trialing, past_due, canceled, expired';
COMMENT ON COLUMN storage_usage.current_plan_id IS 'Plan d''abonnement actuellement actif pour cet utilisateur'; 