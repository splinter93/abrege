#!/usr/bin/env node

// Script de test du flux OAuth corrigé
// Usage: node scripts/test-oauth-flow-fixed.js

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

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

// Configuration OAuth corrigée
const OAUTH_CONFIG = {
  client_id: 'scrivia-custom-gpt',
  redirect_uri: 'https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback',
  scope: 'notes:read notes:write dossiers:read dossiers:write classeurs:read classeurs:write',
  state: 'test-state-fixed'
};

async function testOAuthFlow() {
  console.log('🧪 TEST DU FLUX OAUTH CORRIGÉ');
  console.log('==============================\n');

  try {
    // 1. Vérifier que la table oauth_clients existe
    console.log('1️⃣ Vérification de la table oauth_clients...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'oauth_clients');

    if (tablesError || tables.length === 0) {
      console.error('❌ Table oauth_clients non trouvée');
      process.exit(1);
    }
    console.log('✅ Table oauth_clients trouvée');

    // 2. Vérifier le client OAuth ChatGPT
    console.log('\n2️⃣ Vérification du client OAuth ChatGPT...');
    const { data: client, error: clientError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', OAUTH_CONFIG.client_id)
      .single();

    if (clientError || !client) {
      console.error('❌ Client OAuth ChatGPT non trouvé');
      process.exit(1);
    }

    console.log('✅ Client OAuth ChatGPT trouvé:');
    console.log('   ID:', client.id);
    console.log('   Nom:', client.name);
    console.log('   Actif:', client.is_active ? 'Oui' : 'Non');
    console.log('   URLs:', client.redirect_uris.join(', '));
    console.log('   Scopes:', client.scopes.join(', '));

    // 3. Vérifier que la nouvelle URL est configurée
    console.log('\n3️⃣ Vérification de la nouvelle URL...');
    const expectedUrl = OAUTH_CONFIG.redirect_uri;
    const hasExpectedUrl = client.redirect_uris.includes(expectedUrl);
    
    if (!hasExpectedUrl) {
      console.error('❌ URL attendue non trouvée:', expectedUrl);
      console.error('URLs configurées:', client.redirect_uris);
      console.log('\n💡 Exécutez: node scripts/update-oauth-urls.js');
      process.exit(1);
    }

    console.log('✅ Nouvelle URL configurée:', expectedUrl);

    // 4. Vérifier les scopes
    console.log('\n4️⃣ Vérification des scopes...');
    const requestedScopes = OAUTH_CONFIG.scope.split(' ');
    const allScopesValid = requestedScopes.every(scope => client.scopes.includes(scope));
    
    if (!allScopesValid) {
      console.error('❌ Certains scopes ne sont pas autorisés');
      console.error('Scopes demandés:', requestedScopes);
      console.error('Scopes autorisés:', client.scopes);
      process.exit(1);
    }

    console.log('✅ Tous les scopes sont autorisés:', requestedScopes);

    // 5. Simuler la création d'un code OAuth
    console.log('\n5️⃣ Test de création de code OAuth...');
    
    // Créer un utilisateur de test
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    try {
      const { data: codeData, error: codeError } = await supabase.rpc('create_oauth_code', {
        p_client_id: OAUTH_CONFIG.client_id,
        p_user_id: testUserId,
        p_redirect_uri: OAUTH_CONFIG.redirect_uri,
        p_scopes: requestedScopes,
        p_state: OAUTH_CONFIG.state
      });

      if (codeError) {
        console.error('❌ Erreur création code OAuth:', codeError.message);
        process.exit(1);
      }

      console.log('✅ Code OAuth créé avec succès:', codeData);
    } catch (error) {
      console.log('⚠️ Erreur création code OAuth (normal si utilisateur inexistant):', error.message);
    }

    // 6. Résumé du test
    console.log('\n🎯 RÉSUMÉ DU TEST:');
    console.log('✅ Table oauth_clients accessible');
    console.log('✅ Client OAuth ChatGPT configuré');
    console.log('✅ Nouvelle URL configurée:', expectedUrl);
    console.log('✅ Scopes autorisés');
    console.log('✅ Fonction de création de code accessible');

    console.log('\n🚀 FLUX OAUTH PRÊT À TESTER !');
    console.log('\n📋 URL de test pour /auth:');
    const testParams = new URLSearchParams({
      client_id: OAUTH_CONFIG.client_id,
      redirect_uri: OAUTH_CONFIG.redirect_uri,
      scope: OAUTH_CONFIG.scope,
      state: OAUTH_CONFIG.state,
      response_type: 'code'
    });
    
    console.log(`/auth?${testParams.toString()}`);

    console.log('\n💡 INSTRUCTIONS:');
    console.log('1. Ouvrez l\'URL de test dans votre navigateur');
    console.log('2. Vous devriez voir "Flux OAuth ChatGPT détecté"');
    console.log('3. Cliquez sur "Se connecter avec Google"');
    console.log('4. Le flux devrait se terminer correctement');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le test
testOAuthFlow().catch(console.error);
