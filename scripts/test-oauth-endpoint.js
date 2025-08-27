import dotenv from 'dotenv';

dotenv.config();

async function testOAuthEndpoint() {
  console.log('🧪 TEST ENDPOINT OAUTH CHATGPT');
  console.log('================================\n');

  try {
    // Test de l'endpoint OAuth avec un utilisateur fictif
    console.log('1️⃣ Test de l\'endpoint OAuth...');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/create-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: 'scrivia-custom-gpt',
        userId: '00000000-0000-0000-0000-000000000000', // UUID fictif
        redirectUri: 'https://chat.openai.com/aip/g-011f24575c8d3b9d5d69e124bafa1364ae3badf9/oauth/callback',
        scopes: ['notes:read', 'notes:write', 'dossiers:read', 'dossiers:write', 'classeurs:read', 'classeurs:write', 'profile:read'],
        state: 'test-oauth'
      })
    });

    console.log('📡 Statut de la réponse:', response.status);
    console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Succès ! Code OAuth créé:', data.code);
    } else {
      const errorData = await response.text();
      console.error('❌ Erreur:', errorData);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testOAuthEndpoint();
