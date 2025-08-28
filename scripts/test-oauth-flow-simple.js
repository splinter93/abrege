#!/usr/bin/env node

/**
 * 🧪 TEST SIMPLE DU FLUX OAUTH CHATGPT
 * 
 * Ce script teste le flux OAuth une fois le secret Google configuré
 */

import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

function testOAuthConfig() {
  console.log('🧪 TEST DE LA CONFIGURATION OAUTH CHATGPT');
  console.log('=========================================\n');

  // Vérifier les variables d'environnement
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('1️⃣ Vérification des variables d\'environnement...');
  console.log('✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID:', googleClientId ? '✅ Configuré' : '❌ Manquant');
  console.log('✅ GOOGLE_CLIENT_SECRET:', googleClientSecret ? '✅ Configuré' : '❌ Manquant');
  console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Configuré' : '❌ Manquant');
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Configuré' : '❌ Manquant');

  if (!googleClientSecret) {
    console.log('\n❌ PROBLÈME IDENTIFIÉ: GOOGLE_CLIENT_SECRET manquant !');
    console.log('🔧 SOLUTION:');
    console.log('1. Aller sur Google Cloud Console > APIs & Services > Credentials');
    console.log('2. Éditer votre OAuth 2.0 Client ID');
    console.log('3. Copier le Client Secret (commence par GOCSPX-)');
    console.log('4. Ajouter dans .env: GOOGLE_CLIENT_SECRET=GOCSPX-votre_secret');
    console.log('5. Redémarrer le serveur');
    return;
  }

  console.log('\n✅ Configuration complète !');
  console.log('\n2️⃣ Test du flux OAuth...');
  
  const oauthParams = {
    client_id: 'scrivia-custom-gpt',
            redirect_uri: 'https://chat.openai.com/aip/g-369c00bd47b6f501275b414d19d5244ac411097b/oauth/callback',
    scope: 'notes:read notes:write dossiers:read dossiers:write classeurs:read classeurs:write',
    response_type: 'code',
    state: 'test-state-' + Date.now()
  };
  
  const authUrl = `http://localhost:3000/auth?${new URLSearchParams(oauthParams).toString()}`;
  
  console.log('🔗 URL de test OAuth:');
  console.log(authUrl);
  
  console.log('\n3️⃣ Instructions de test:');
  console.log('1. Ouvrir cette URL dans votre navigateur');
  console.log('2. Cliquer sur "Se connecter avec Google"');
  console.log('3. Suivre l\'authentification Google');
  console.log('4. Vérifier la redirection vers ChatGPT');
  
  console.log('\n4️⃣ Paramètres pour ChatGPT:');
  console.log('Client ID: scrivia-custom-gpt');
  console.log('Client Secret: scrivia-gpt-secret-2024');
  console.log('Redirect URI:', oauthParams.redirect_uri);
  console.log('Scopes:', oauthParams.scope);
  
  console.log('\n🎉 Test de configuration terminé !');
  console.log('🚀 Votre flux OAuth devrait maintenant fonctionner !');
}

// Exécuter le test
testOAuthConfig();
