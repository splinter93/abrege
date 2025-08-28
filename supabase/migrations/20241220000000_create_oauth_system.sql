-- Migration pour le système OAuth Scrivia
-- Date: 2024-12-20
-- Description: Création des tables et fonctions pour un système OAuth production-ready

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des clients OAuth
CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    redirect_uris TEXT[] NOT NULL,
    scopes TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des codes d'autorisation OAuth
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    redirect_uri TEXT NOT NULL,
    scopes TEXT[] NOT NULL,
    state VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des tokens d'accès OAuth
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    scopes TEXT[] NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des refresh tokens OAuth
CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    access_token_id UUID NOT NULL REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_code ON oauth_authorization_codes(code);
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_expires_at ON oauth_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_client_user ON oauth_authorization_codes(client_id, user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_token_hash ON oauth_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_expires_at ON oauth_access_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_client_user ON oauth_access_tokens(client_id, user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_token_hash ON oauth_refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_expires_at ON oauth_refresh_tokens(expires_at);

-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_oauth_clients_updated_at 
    BEFORE UPDATE ON oauth_clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour nettoyer les codes et tokens expirés
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_data()
RETURNS void AS $$
BEGIN
    -- Supprimer les codes d'autorisation expirés
    DELETE FROM oauth_authorization_codes 
    WHERE expires_at < NOW();
    
    -- Supprimer les access tokens expirés
    DELETE FROM oauth_access_tokens 
    WHERE expires_at < NOW();
    
    -- Supprimer les refresh tokens expirés
    DELETE FROM oauth_refresh_tokens 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Fonction RPC pour créer un code OAuth (utilisée par l'API)
CREATE OR REPLACE FUNCTION create_oauth_code(
    p_client_id TEXT,
    p_user_id UUID,
    p_redirect_uri TEXT,
    p_scopes TEXT[],
    p_state TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_client_id TEXT;
BEGIN
    -- Vérifier que le client existe et est actif
    SELECT client_id INTO v_client_id
    FROM oauth_clients
    WHERE client_id = p_client_id AND is_active = true;
    
    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Client OAuth invalide ou inactif';
    END IF;
    
    -- Vérifier que le redirect_uri est autorisé
    IF NOT EXISTS (
        SELECT 1 FROM oauth_clients 
        WHERE client_id = p_client_id 
        AND p_redirect_uri = ANY(redirect_uris)
    ) THEN
        RAISE EXCEPTION 'Redirect URI non autorisé';
    END IF;
    
    -- Vérifier que les scopes sont autorisés
    IF NOT EXISTS (
        SELECT 1 FROM oauth_clients 
        WHERE client_id = p_client_id 
        AND p_scopes <@ scopes
    ) THEN
        RAISE EXCEPTION 'Scopes non autorisés';
    END IF;
    
    -- Générer un code unique
    v_code := encode(gen_random_bytes(32), 'hex');
    
    -- Insérer le code d'autorisation
    INSERT INTO oauth_authorization_codes (
        code, client_id, user_id, redirect_uri, scopes, state, expires_at
    ) VALUES (
        v_code, p_client_id, p_user_id, p_redirect_uri, p_scopes, p_state, 
        NOW() + INTERVAL '10 minutes'
    );
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insérer les clients OAuth par défaut
INSERT INTO oauth_clients (client_id, client_secret_hash, name, description, redirect_uris, scopes) VALUES
(
    'scrivia-custom-gpt',
    -- Hash du secret 'scrivia-gpt-secret-2024' (à générer avec bcrypt)
    '$2b$10$rQZ8K9mN2pL5sT7vX1yA3bC4dE6fG7hI8jK9lM0nO1pQ2rS3tU4vW5xY6z',
    'Scrivia ChatGPT Action',
    'Action personnalisée ChatGPT pour interagir avec l''API Scrivia',
    ARRAY['https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback', 'https://scrivia.app/auth/callback'],
    ARRAY['notes:read', 'notes:write', 'dossiers:read', 'dossiers:write', 'classeurs:read', 'classeurs:write']
)
ON CONFLICT (client_id) DO NOTHING;

-- Créer un utilisateur de test pour le développement (à supprimer en production)
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
-- (
--     '00000000-0000-0000-0000-000000000001',
--     'test@scrivia.app',
--     crypt('testpassword', gen_salt('bf')),
--     NOW(),
--     NOW(),
--     NOW()
-- ) ON CONFLICT (id) DO NOTHING;

-- RLS (Row Level Security) pour la sécurité
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour oauth_clients (lecture publique pour validation)
CREATE POLICY "oauth_clients_read_policy" ON oauth_clients
    FOR SELECT USING (is_active = true);

-- Politiques RLS pour oauth_authorization_codes (accès limité)
CREATE POLICY "oauth_authorization_codes_insert_policy" ON oauth_authorization_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "oauth_authorization_codes_select_policy" ON oauth_authorization_codes
    FOR SELECT USING (expires_at > NOW() AND used_at IS NULL);

CREATE POLICY "oauth_authorization_codes_update_policy" ON oauth_authorization_codes
    FOR UPDATE USING (expires_at > NOW());

-- Politiques RLS pour oauth_access_tokens
CREATE POLICY "oauth_access_tokens_insert_policy" ON oauth_access_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "oauth_access_tokens_select_policy" ON oauth_access_tokens
    FOR SELECT USING (expires_at > NOW() AND revoked_at IS NULL);

CREATE POLICY "oauth_access_tokens_update_policy" ON oauth_access_tokens
    FOR UPDATE USING (expires_at > NOW());

-- Politiques RLS pour oauth_refresh_tokens
CREATE POLICY "oauth_refresh_tokens_insert_policy" ON oauth_refresh_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "oauth_refresh_tokens_select_policy" ON oauth_refresh_tokens
    FOR SELECT USING (expires_at > NOW() AND revoked_at IS NULL);

CREATE POLICY "oauth_refresh_tokens_update_policy" ON oauth_refresh_tokens
    FOR UPDATE USING (expires_at > NOW());

-- Commentaires pour la documentation
COMMENT ON TABLE oauth_clients IS 'Clients OAuth autorisés à utiliser l''API Scrivia';
COMMENT ON TABLE oauth_authorization_codes IS 'Codes d''autorisation OAuth temporaires';
COMMENT ON TABLE oauth_access_tokens IS 'Tokens d''accès OAuth pour l''API';
COMMENT ON TABLE oauth_refresh_tokens IS 'Tokens de rafraîchissement OAuth';
COMMENT ON FUNCTION cleanup_expired_oauth_data() IS 'Nettoie automatiquement les données OAuth expirées';
