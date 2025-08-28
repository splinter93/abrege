#!/usr/bin/env node

/**
 * Script de test complet pour le flux OAuth ChatGPT
 * Teste l'ensemble du processus : auth → code → token → utilisation
 */

const fetch = require('node-fetch');

// Configuration de test
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  clientId: 'scrivia-custom-gpt',
  clientSecret: 'scrivia-gpt-secret-2024',
  redirectUri: 'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback',
  scopes: ['notes:read', 'notes:write', 'dossiers:read', 'dossiers:write', 'classeurs:read', 'classeurs:write', 'profile:read']
};

async function testCompleteOAuthFlow() {
  console.log('🧪 TEST COMPLET DU FLUX OAUTH CHATGPT');
  console.log('=====================================\n');

  try {
    // 1. Test de l'endpoint d'autorisation
    console.log('1️⃣ Test de l\'endpoint d\'autorisation...');
    const authResult = await testAuthorizationEndpoint();
    
    if (!authResult.success) {
      console.log('   ❌ Échec de l\'autorisation, arrêt des tests');
      return;
    }
    
    // 2. Test de l\'échange code → token
    console.log('\n2️⃣ Test de l\'échange code → token...');
    const tokenResult = await testTokenExchange(authResult.code);
    
    if (!tokenResult.success) {
      console.log('   ❌ Échec de l\'échange de token, arrêt des tests');
      return;
    }
    
    // 3. Test de l\'utilisation du token
    console.log('\n3️⃣ Test de l\'utilisation du token...');
    await testTokenUsage(tokenResult.accessToken);
    
    console.log('\n✅ Test complet du flux OAuth terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

async function testAuthorizationEndpoint() {
  try {
    // Simuler la requête d'autorisation OAuth
    const authUrl = `${TEST_CONFIG.baseUrl}/auth?response_type=code&client_id=${TEST_CONFIG.clientId}&redirect_uri=${encodeURIComponent(TEST_CONFIG.redirectUri)}&scope=${TEST_CONFIG.scopes.join(' ')}&state=test-state-123`;
    
    console.log('   🔍 URL d\'autorisation:', authUrl);
    
    const response = await fetch(authUrl);
    
    if (response.ok) {
      const html = await response.text();
      console.log('   ✅ Page d\'autorisation accessible');
      
      // Vérifier que c'est bien une page OAuth ChatGPT
      if (html.includes('scrivia-custom-gpt')) {
        console.log('   ✅ Client ID détecté dans la page');
      } else {
        console.log('   ⚠️ Client ID non détecté dans la page');
      }
      
      // Simuler une redirection avec un code fictif
      const mockCode = 'mock_authorization_code_123';
      console.log('   🔍 Code d\'autorisation simulé:', mockCode);
      
      return { success: true, code: mockCode };
    } else {
      console.log('   ❌ Page d\'autorisation inaccessible:', response.status);
      return { success: false };
    }
  } catch (error) {
    console.log('   ❌ Erreur endpoint d\'autorisation:', error.message);
    return { success: false };
  }
}

async function testTokenExchange(authCode) {
  try {
    console.log('   🔍 Échange du code:', authCode);
    
    // Préparer la requête form-encoded comme ChatGPT
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', authCode);
    formData.append('redirect_uri', TEST_CONFIG.redirectUri);
    formData.append('client_id', TEST_CONFIG.clientId);
    formData.append('client_secret', TEST_CONFIG.clientSecret);
    
    console.log('   🔍 Paramètres de la requête token:');
    console.log('      grant_type:', formData.get('grant_type'));
    console.log('      code:', formData.get('code'));
    console.log('      redirect_uri:', formData.get('redirect_uri'));
    console.log('      client_id:', formData.get('client_id'));
    console.log('      client_secret:', formData.get('client_secret') ? 'PRÉSENT' : 'MANQUANT');
    
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ChatGPT/1.0 (OpenAI)'
      },
      body: formData.toString()
    });
    
    console.log('   📊 Status de la réponse:', response.status);
    console.log('   📊 Headers de la réponse:');
    response.headers.forEach((value, key) => {
      console.log(`      ${key}:`, value);
    });
    
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
    } else if (response.status === 401) {
      const errorData = await response.text();
      console.log('   ❌ Accès refusé (401):', errorData);
      
      // Test de l'endpoint de débogage pour voir ce qui est reçu
      console.log('   🔍 Test de l\'endpoint de débogage...');
      await testDebugEndpoint(accessToken);
    } else {
      console.log('   ⚠️ Statut inattendu:', response.status);
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
  testCompleteOAuthFlow();
}

module.exports = { testCompleteOAuthFlow };
