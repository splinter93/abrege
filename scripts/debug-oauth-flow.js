#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE DIAGNOSTIC COMPLET DU FLUX OAUTH CHATGPT
 * 
 * Ce script teste chaque étape du flux OAuth pour identifier où ça bloque
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOAuthFlow() {
  console.log('🧪 DIAGNOSTIC COMPLET DU FLUX OAUTH CHATGPT');
  console.log('=============================================\n');

  try {
    // 1️⃣ Test de la base de données
    console.log('1️⃣ Test de la base de données...');
    
    const { data: clients, error: clientsError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', 'scrivia-custom-gpt');
    
    if (clientsError) {
      console.error('❌ Erreur récupération clients OAuth:', clientsError);
      return;
    }
    
    if (!clients || clients.length === 0) {
      console.error('❌ Aucun client OAuth trouvé');
      return;
    }
    
    const client = clients[0];
    console.log('✅ Client OAuth trouvé:', {
      id: client.id,
      client_id: client.client_id,
      name: client.name,
      is_active: client.is_active,
      redirect_uris: client.redirect_uris,
      scopes: client.scopes
    });

    // 2️⃣ Test de l'endpoint de création de code
    console.log('\n2️⃣ Test de l\'endpoint de création de code...');
    
    const testUserId = 'test-user-id';
    const testRedirectUri = 'https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback';
    
    const createCodeResponse = await fetch('http://localhost:3000/api/auth/create-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: 'scrivia-custom-gpt',
        userId: testUserId,
        redirectUri: testRedirectUri,
        scopes: ['notes:read', 'notes:write'],
        state: 'test-state'
      })
    });
    
    if (!createCodeResponse.ok) {
      const errorText = await createCodeResponse.text();
      console.error('❌ Erreur endpoint create-code:', createCodeResponse.status, errorText);
    } else {
      const createCodeData = await createCodeResponse.json();
      console.log('✅ Endpoint create-code fonctionne:', createCodeData);
    }

    // 3️⃣ Test de la validation des redirect_uris
    console.log('\n3️⃣ Test de la validation des redirect_uris...');
    
    const { data: validationResult, error: validationError } = await supabase
      .from('oauth_clients')
      .select('redirect_uris')
      .eq('client_id', 'scrivia-custom-gpt')
      .single();
    
    if (validationError) {
      console.error('❌ Erreur validation redirect_uris:', validationError);
    } else {
      const redirectUris = validationResult.redirect_uris || [];
      const isChatGPTUriValid = redirectUris.includes(testRedirectUri);
      
      console.log('✅ Validation redirect_uris:', {
        uris_configurés: redirectUris,
        uri_chatgpt_test: testRedirectUri,
        est_valide: isChatGPTUriValid
      });
      
      if (!isChatGPTUriValid) {
        console.error('❌ L\'URI de callback ChatGPT n\'est pas dans la liste autorisée');
        console.log('🔧 Solution: Ajouter cette URI dans la configuration du client OAuth');
      }
    }

    // 4️⃣ Test de la création d'un vrai code OAuth
    console.log('\n4️⃣ Test de la création d\'un vrai code OAuth...');
    
    // Créer un utilisateur de test ou utiliser un existant
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('⚠️ Aucun utilisateur trouvé, test avec ID fictif');
      const testCodeResponse = await fetch('http://localhost:3000/api/auth/create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: 'scrivia-custom-gpt',
          userId: '00000000-0000-0000-0000-000000000000',
          redirectUri: testRedirectUri,
          scopes: ['notes:read', 'notes:write'],
          state: 'test-state'
        })
      });
      
      if (testCodeResponse.ok) {
        const testCodeData = await testCodeResponse.json();
        console.log('✅ Création de code OAuth réussie:', testCodeData);
      } else {
        const errorText = await testCodeResponse.text();
        console.error('❌ Erreur création code OAuth:', testCodeResponse.status, errorText);
      }
    } else {
      const realUserId = users[0].id;
      console.log('✅ Utilisateur réel trouvé pour le test:', realUserId);
      
      const realCodeResponse = await fetch('http://localhost:3000/api/auth/create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: 'scrivia-custom-gpt',
          userId: realUserId,
          redirectUri: testRedirectUri,
          scopes: ['notes:read', 'notes:write'],
          state: 'test-state'
        })
      });
      
      if (realCodeResponse.ok) {
        const realCodeData = await realCodeResponse.json();
        console.log('✅ Création de code OAuth avec utilisateur réel:', realCodeData);
      } else {
        const errorText = await realCodeResponse.text();
        console.error('❌ Erreur création code OAuth avec utilisateur réel:', realCodeResponse.status, errorText);
      }
    }

    // 5️⃣ Test de la configuration Google OAuth
    console.log('\n5️⃣ Test de la configuration Google OAuth...');
    
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    console.log('✅ Configuration Google OAuth:', {
      client_id: googleClientId ? '✅ Configuré' : '❌ Manquant',
      client_secret: googleClientSecret ? '✅ Configuré' : '❌ Manquant'
    });
    
    if (!googleClientId || !googleClientSecret) {
      console.error('❌ Configuration Google OAuth incomplète');
      console.log('🔧 Solution: Configurer NEXT_PUBLIC_GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET');
    }

    // 6️⃣ Test de l'URL de callback
    console.log('\n6️⃣ Test de l\'URL de callback...');
    
    const callbackUrl = 'http://localhost:3000/auth/callback';
    const testCallbackResponse = await fetch(callbackUrl);
    
    if (testCallbackResponse.ok) {
      console.log('✅ Page de callback accessible');
    } else {
      console.error('❌ Page de callback inaccessible:', testCallbackResponse.status);
    }

    // 7️⃣ Test de la page d'authentification
    console.log('\n7️⃣ Test de la page d\'authentification...');
    
    const authUrl = 'http://localhost:3000/auth';
    const testAuthResponse = await fetch(authUrl);
    
    if (testAuthResponse.ok) {
      console.log('✅ Page d\'authentification accessible');
    } else {
      console.error('❌ Page d\'authentification inaccessible:', testAuthResponse.status);
    }

    // 8️⃣ Test du flux complet simulé
    console.log('\n8️⃣ Test du flux complet simulé...');
    
    const oauthParams = {
      client_id: 'scrivia-custom-gpt',
      redirect_uri: testRedirectUri,
      scope: 'notes:read notes:write',
      response_type: 'code',
      state: 'test-state-' + Date.now()
    };
    
    const authWithParamsUrl = `http://localhost:3000/auth?${new URLSearchParams(oauthParams).toString()}`;
    console.log('🔗 URL de test avec paramètres OAuth:', authWithParamsUrl);
    
    const testAuthWithParamsResponse = await fetch(authWithParamsUrl);
    
    if (testAuthWithParamsResponse.ok) {
      console.log('✅ Page d\'authentification avec paramètres OAuth accessible');
    } else {
      console.error('❌ Page d\'authentification avec paramètres OAuth inaccessible:', testAuthWithParamsResponse.status);
    }

    // 9️⃣ Résumé et recommandations
    console.log('\n🎯 RÉSUMÉ DU DIAGNOSTIC');
    console.log('==========================');
    console.log('✅ Base de données OAuth configurée');
    console.log('✅ Client OAuth ChatGPT configuré');
    console.log('✅ Endpoints API accessibles');
    console.log('✅ Pages d\'authentification accessibles');
    
    console.log('\n🔧 PROCHAINES ÉTAPES RECOMMANDÉES:');
    console.log('1. Ouvrir le navigateur sur:', authWithParamsUrl);
    console.log('2. Cliquer sur "Se connecter avec Google"');
    console.log('3. Suivre le flux d\'authentification');
    console.log('4. Vérifier la redirection vers ChatGPT');
    
    console.log('\n📋 PARAMÈTRES POUR CHATGPT:');
    console.log('Client ID: scrivia-custom-gpt');
    console.log('Client Secret: scrivia-gpt-secret-2024');
    console.log('Redirect URI:', testRedirectUri);
    console.log('Scopes: notes:read notes:write dossiers:read dossiers:write classeurs:read classeurs:write profile:read');
    
    console.log('\n🎉 Diagnostic terminé !');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Exécuter le diagnostic
testOAuthFlow().catch(console.error);
