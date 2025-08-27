#!/usr/bin/env node

// Script pour appliquer la migration OAuth
// Usage: node scripts/apply-oauth-migration.js

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyOAuthMigration() {
  console.log('🚀 APPLICATION DE LA MIGRATION OAUTH');
  console.log('====================================\n');

  try {
    // 1. Créer la table oauth_clients
    console.log('1️⃣ Création de la table oauth_clients...');
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS oauth_clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      `
    });

    if (createTableError) {
      console.log('⚠️ Table oauth_clients existe déjà ou erreur:', createTableError.message);
    } else {
      console.log('✅ Table oauth_clients créée');
    }

    // 2. Créer la table oauth_authorization_codes
    console.log('\n2️⃣ Création de la table oauth_authorization_codes...');
    const { error: createCodesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(255) UNIQUE NOT NULL,
          client_id VARCHAR(255) NOT NULL,
          user_id UUID NOT NULL,
          redirect_uri TEXT NOT NULL,
          scopes TEXT[] NOT NULL,
          state VARCHAR(255),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createCodesError) {
      console.log('⚠️ Table oauth_authorization_codes existe déjà ou erreur:', createCodesError.message);
    } else {
      console.log('✅ Table oauth_authorization_codes créée');
    }

    // 3. Créer la table oauth_access_tokens
    console.log('\n3️⃣ Création de la table oauth_access_tokens...');
    const { error: createTokensError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS oauth_access_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          token_hash VARCHAR(255) UNIQUE NOT NULL,
          client_id VARCHAR(255) NOT NULL,
          user_id UUID NOT NULL,
          scopes TEXT[] NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          revoked_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createTokensError) {
      console.log('⚠️ Table oauth_access_tokens existe déjà ou erreur:', createTokensError.message);
    } else {
      console.log('✅ Table oauth_access_tokens créée');
    }

    // 4. Créer la table oauth_refresh_tokens
    console.log('\n4️⃣ Création de la table oauth_refresh_tokens...');
    const { error: createRefreshError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          token_hash VARCHAR(255) UNIQUE NOT NULL,
          access_token_id UUID NOT NULL,
          client_id VARCHAR(255) NOT NULL,
          user_id UUID NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          revoked_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createRefreshError) {
      console.log('⚠️ Table oauth_refresh_tokens existe déjà ou erreur:', createRefreshError.message);
    } else {
      console.log('✅ Table oauth_refresh_tokens créée');
    }

    // 5. Insérer le client OAuth ChatGPT
    console.log('\n5️⃣ Configuration du client OAuth ChatGPT...');
    const { data: existingClient, error: checkError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', 'scrivia-custom-gpt')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erreur vérification client existant:', checkError.message);
      return false;
    }

    if (existingClient) {
      console.log('✅ Client OAuth ChatGPT existe déjà');
      console.log('   ID:', existingClient.id);
      console.log('   Nom:', existingClient.name);
      
      // Mettre à jour les redirect_uris
      console.log('\n🔄 Mise à jour des redirect_uris...');
      const { error: updateError } = await supabase
        .from('oauth_clients')
        .update({ 
          redirect_uris: [
            'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback',
            'https://scrivia.app/auth/callback'
          ],
          scopes: ['notes:read', 'notes:write', 'dossiers:read', 'dossiers:write', 'classeurs:read', 'classeurs:write', 'profile:read'],
          updated_at: new Date().toISOString()
        })
        .eq('client_id', 'scrivia-custom-gpt');
      
      if (updateError) {
        console.error('❌ Erreur mise à jour:', updateError.message);
        return false;
      } else {
        console.log('✅ Redirect URIs et scopes mis à jour');
      }
    } else {
      console.log('🆕 Création du client OAuth ChatGPT...');
      
      // Utiliser un hash simple pour le secret (en production, utilisez bcrypt)
      const clientSecretHash = 'scrivia-gpt-secret-2024-hash';
      
      const { data: newClient, error: createError } = await supabase
        .from('oauth_clients')
        .insert({
          client_id: 'scrivia-custom-gpt',
          client_secret_hash: clientSecretHash,
          name: 'Scrivia ChatGPT Action',
          description: 'Action personnalisée ChatGPT pour interagir avec l\'API Scrivia',
          redirect_uris: [
            'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback',
            'https://scrivia.app/auth/callback'
          ],
          scopes: [
            'notes:read',
            'notes:write', 
            'dossiers:read',
            'dossiers:write',
            'classeurs:read',
            'classeurs:write',
            'profile:read'
          ],
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erreur création client:', createError.message);
        return false;
      }

      console.log('✅ Client OAuth ChatGPT créé avec succès');
      console.log('   ID:', newClient.id);
      console.log('   Client ID:', newClient.client_id);
      console.log('   Nom:', newClient.name);
    }

    console.log('\n✅ Migration OAuth appliquée avec succès !');
    console.log('\n🎯 Prochaines étapes:');
    console.log('1. Tester la configuration: node scripts/test-chatgpt-oauth.js');
    console.log('2. Configurer ChatGPT avec le client ID: scrivia-custom-gpt');

    return true;

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Exécuter la migration
applyOAuthMigration().then(success => {
  if (success) {
    console.log('\n🎉 Migration OAuth terminée avec succès !');
    process.exit(0);
  } else {
    console.log('\n❌ Migration OAuth échouée.');
    process.exit(1);
  }
}).catch(console.error);
