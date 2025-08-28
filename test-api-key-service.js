// Test du service ApiKeyService
const API_KEY = 'scrivia-api-key-2024';

async function testApiKeyService() {
  console.log('🔑 Test du service ApiKeyService...\n');

  try {
    // Simuler une requête avec l'API Key
    const response = await fetch('http://localhost:3000/api/v2/debug', {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Succès:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Erreur:', error);
    }
  } catch (error) {
    console.log('❌ Exception:', error.message);
  }
}

// Lancer le test
testApiKeyService().catch(console.error);
