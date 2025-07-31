-- Création de la table user_settings pour les paramètres par défaut
-- Table séparée de users pour une meilleure organisation

-- 1. Créer le type enum pour le thème
CREATE TYPE theme_mode AS ENUM ('light', 'dark', 'auto');

-- 2. Créer la table user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Paramètres d'interface
  default_header_image BOOLEAN DEFAULT false,
  default_font_family TEXT DEFAULT 'Noto Sans',
  default_wide_mode BOOLEAN DEFAULT false,
  theme_mode theme_mode DEFAULT 'auto',
  last_theme_choice TEXT,
  
  -- Paramètres de notifications
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  
  -- Paramètres de langue et localisation
  default_language TEXT DEFAULT 'fr',
  timezone TEXT DEFAULT 'UTC',
  
  -- Paramètres d'affichage
  items_per_page INTEGER DEFAULT 20,
  auto_save_interval INTEGER DEFAULT 30000, -- en millisecondes
  show_toolbar BOOLEAN DEFAULT true,
  show_sidebar BOOLEAN DEFAULT true,
  
  -- Paramètres d'édition
  auto_complete_enabled BOOLEAN DEFAULT true,
  spell_check_enabled BOOLEAN DEFAULT true,
  word_wrap_enabled BOOLEAN DEFAULT true,
  
  -- Paramètres de partage
  default_visibility TEXT DEFAULT 'private',
  auto_share_enabled BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Contrainte d'unicité : un seul settings par utilisateur
  UNIQUE(user_id)
);

-- 3. Contraintes de validation
-- Vérification des fontes autorisées
ALTER TABLE user_settings ADD CONSTRAINT check_font_family 
  CHECK (default_font_family IN (
    'Noto Sans', 'Arial', 'Helvetica', 'Times New Roman', 
    'Georgia', 'Verdana', 'Courier New', 'Monaco', 'Menlo'
  ));

-- Vérification de la langue
ALTER TABLE user_settings ADD CONSTRAINT check_default_language 
  CHECK (default_language IN ('fr', 'en', 'es', 'de', 'it', 'pt'));

-- Vérification du timezone
ALTER TABLE user_settings ADD CONSTRAINT check_timezone 
  CHECK (timezone IN ('UTC', 'Europe/Paris', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney'));

-- Vérification de la visibilité par défaut
ALTER TABLE user_settings ADD CONSTRAINT check_default_visibility 
  CHECK (default_visibility IN ('private', 'shared', 'members', 'public'));

-- Vérification des valeurs numériques
ALTER TABLE user_settings ADD CONSTRAINT check_items_per_page 
  CHECK (items_per_page BETWEEN 5 AND 100);

ALTER TABLE user_settings ADD CONSTRAINT check_auto_save_interval 
  CHECK (auto_save_interval BETWEEN 5000 AND 300000);

-- 4. Indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_theme ON user_settings(theme_mode);
CREATE INDEX IF NOT EXISTS idx_user_settings_language ON user_settings(default_language);

-- 5. Trigger pour mettre à jour updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Fonction pour créer automatiquement les settings par défaut
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger pour créer les settings automatiquement
CREATE TRIGGER trigger_create_default_user_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_user_settings();

-- 8. Commentaires pour documentation
COMMENT ON TABLE user_settings IS 'Paramètres par défaut et préférences utilisateur';
COMMENT ON COLUMN user_settings.default_header_image IS 'Image de couverture systématique dans les nouvelles notes';
COMMENT ON COLUMN user_settings.default_font_family IS 'Fonte par défaut préférée';
COMMENT ON COLUMN user_settings.default_wide_mode IS 'Mode large par défaut';
COMMENT ON COLUMN user_settings.theme_mode IS 'Mode thème : light, dark, auto';
COMMENT ON COLUMN user_settings.last_theme_choice IS 'Dernier choix de thème effectué';
COMMENT ON COLUMN user_settings.notifications_enabled IS 'Notifications activées';
COMMENT ON COLUMN user_settings.default_language IS 'Langue par défaut';
COMMENT ON COLUMN user_settings.items_per_page IS 'Nombre d''éléments par page';
COMMENT ON COLUMN user_settings.auto_save_interval IS 'Intervalle de sauvegarde automatique (ms)';
COMMENT ON COLUMN user_settings.default_visibility IS 'Visibilité par défaut des nouvelles notes'; 