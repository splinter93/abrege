-- Ajout des colonnes de profil utilisateur
-- Enrichissement de la table users pour une meilleure UX

-- 1. Colonnes de base (demandées)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS surname TEXT;

-- 2. Colonnes supplémentaires (recommandées)
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr';
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 3. Contraintes pour la validation
-- Vérification que profile_picture est une URL valide (si non null)
ALTER TABLE users ADD CONSTRAINT check_profile_picture_url 
  CHECK (profile_picture IS NULL OR profile_picture ~ '^https?://');

-- Vérification que timezone est valide
ALTER TABLE users ADD CONSTRAINT check_timezone 
  CHECK (timezone IN ('UTC', 'Europe/Paris', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney'));

-- Vérification que language est valide
ALTER TABLE users ADD CONSTRAINT check_language 
  CHECK (language IN ('fr', 'en', 'es', 'de', 'it', 'pt'));

-- 4. Indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_surname ON users(surname);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_name_surname ON users(name, surname);

-- 5. Index pour les recherches textuelles
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(to_tsvector('french', COALESCE(name, '') || ' ' || COALESCE(surname, '') || ' ' || COALESCE(display_name, '')));

-- 6. Commentaires pour documentation
COMMENT ON COLUMN users.profile_picture IS 'URL de la photo de profil de l''utilisateur';
COMMENT ON COLUMN users.name IS 'Prénom de l''utilisateur';
COMMENT ON COLUMN users.surname IS 'Nom de famille de l''utilisateur';
COMMENT ON COLUMN users.display_name IS 'Nom d''affichage personnalisé (optionnel)';
COMMENT ON COLUMN users.bio IS 'Description courte de l''utilisateur';
COMMENT ON COLUMN users.timezone IS 'Fuseau horaire de l''utilisateur (UTC par défaut)';
COMMENT ON COLUMN users.language IS 'Langue préférée de l''utilisateur (fr par défaut)';
COMMENT ON COLUMN users.settings IS 'Préférences utilisateur en JSON (thème, notifications, etc.)'; 