#!/usr/bin/env node

/**
 * Script de test pour générer un vrai token OAuth et tester l'authentification
 * Simule le flux complet : auth → code → token → utilisation
 */

const fetch = require('node-fetch');

// Configuration de test
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  clientId: 'scrivia-custom-gpt',
  clientSecret: 'scrivia-gpt-secret-2024',
  redirectUri: 'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback'
};

async function testRealOAuthFlow() {
  console.log('🧪 TEST DU FLUX OAUTH COMPLET AVEC VRAI TOKEN');
  console.log('=============================================\n');

  try {
    // 1. Créer un code d'autorisation valide
    console.log('1️⃣ Création d\'un code d\'autorisation valide...');
    const authCode = await createValidAuthCode();
    
    if (!authCode) {
      console.log('   ❌ Impossible de créer un code d\'autorisation');
      return;
    }
    
    console.log('   ✅ Code d\'autorisation créé:', authCode);
    
    // 2. Échanger le code contre un token
    console.log('\n2️⃣ Échange du code contre un token...');
    const tokenResult = await exchangeCodeForToken(authCode);
    
    if (!tokenResult.success) {
      console.log('   ❌ Échec de l\'échange de token');
      return;
    }
    
    console.log('   ✅ Token reçu avec succès');
    console.log('      Type:', tokenResult.tokenType);
    console.log('      Expire dans:', tokenResult.expiresIn, 'secondes');
    
    // 3. Tester l\'utilisation du token
    console.log('\n3️⃣ Test de l\'utilisation du token...');
    await testTokenUsage(tokenResult.accessToken);
    
    console.log('\n✅ Test complet du flux OAuth terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

async function createValidAuthCode() {
  try {
    // Utiliser l'endpoint create-code pour générer un vrai code
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/create-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_session_token' // Token de session fictif
      },
      body: JSON.stringify({
        clientId: TEST_CONFIG.clientId,
        userId: 'test-user-id',
        redirectUri: TEST_CONFIG.redirectUri,
        scopes: ['notes:read', 'classeurs:read'],
        state: 'test-state-123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.code;
    } else {
      const errorText = await response.text();
      console.log('   ❌ Erreur création code:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.log('   ❌ Erreur création code:', error.message);
    return null;
  }
}

async function exchangeCodeForToken(authCode) {
  try {
    console.log('   🔍 Échange du code:', authCode);
    
    // Préparer la requête form-encoded comme ChatGPT
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', authCode);
    formData.append('redirect_uri', TEST_CONFIG.redirectUri);
    formData.append('client_id', TEST_CONFIG.clientId);
    formData.append('client_secret', TEST_CONFIG.clientSecret);
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ChatGPT/1.0 (OpenAI)'
      },
      body: formData.toString()
    });
    
    console.log('   📊 Status de la réponse:', response.status);
    
    if (response.ok) {
      const tokenData = await response.json();
      console.log('   ✅ Token reçu avec succès:');
      console.log('      access_token:', tokenData.access_token ? `${tokenData.access_token.substring(0, 20)}...` : 'MANQUANT');
      console.log('      token_type:', tokenData.token_type);
      console.log('      expires_in:', tokenData.expires_in);
      console.log('      refresh_token:', tokenData.refresh_token ? 'PRÉSENT' : 'MANQUANT');
      
      return { 
        success: true, 
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in
      };
    } else {
      const errorData = await response.text();
      console.log('   ❌ Erreur lors de l\'échange de token:');
      console.log('      Status:', response.status);
      console.log('      Réponse:', errorData);
      
      return { success: false };
    }
  } catch (error) {
    console.log('   ❌ Erreur échange de token:', error.message);
    return { success: false };
  }
}

async function testTokenUsage(accessToken) {
  try {
    console.log('   🔍 Test avec le token reçu');
    
    // Test de l'endpoint classeurs avec le token
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/v1/classeurs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ChatGPT/1.0 (OpenAI)'
      }
    });
    
    console.log('   📊 Status de la réponse classeurs:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Accès autorisé aux classeurs');
      console.log('   📊 Nombre de classeurs:', data.length || 'N/A');
      
      // Afficher les premiers classeurs
      if (data.length > 0) {
        console.log('   📋 Exemples de classeurs:');
        data.slice(0, 3).forEach((classeur, index) => {
          console.log(`      ${index + 1}. ${classeur.name} (${classeur.emoji || '📁'})`);
        });
      }
    } else if (response.status === 401) {
      const errorData = await response.text();
      console.log('   ❌ Accès refusé (401):', errorData);
      
      // Test de l'endpoint de débogage pour voir ce qui est reçu
      console.log('   🔍 Test de l\'endpoint de débogage...');
      await testDebugEndpoint(accessToken);
    } else {
      console.log('   ⚠️ Statut inattendu:', response.status);
      const errorData = await response.text();
      console.log('   📝 Réponse:', errorData);
    }
  } catch (error) {
    console.log('   ❌ Erreur test d\'utilisation:', error.message);
  }
}

async function testDebugEndpoint(accessToken) {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/debug-chatgpt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ChatGPT/1.0 (OpenAI)'
      },
      body: JSON.stringify({
        test: 'token_usage',
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   🔍 Résumé du débogage:');
      console.log('      Headers reçus:', data.debug.headers.length);
      console.log('      Headers d\'auth:', data.debug.authHeaders);
      console.log('      Signature ChatGPT:', data.debug.isChatGPTRequest);
    } else {
      console.log('   ❌ Endpoint de débogage inaccessible:', response.status);
    }
  } catch (error) {
    console.log('   ❌ Erreur endpoint de débogage:', error.message);
  }
}

// Exécuter les tests
if (require.main === module) {
  testRealOAuthFlow();
}

module.exports = { testRealOAuthFlow };
