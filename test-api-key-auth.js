const API_KEY = 'scrivia-api-key-2024'; // Remplacez par votre vraie clé API
const BASE_URL = 'https://scrivia.app/api/v2';

async function testApiKeyAuth() {
  console.log('🔑 Test de l\'authentification par clé API...\n');

  // Test 1: Endpoint /me
  console.log('📋 Test 1: Récupération du profil utilisateur (/me)');
  try {
    const response = await fetch(`${BASE_URL}/me`, {
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

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Endpoint /classeurs
  console.log('📁 Test 2: Récupération des classeurs (/classeurs)');
  try {
    const response = await fetch(`${BASE_URL}/classeurs`, {
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

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Endpoint /notes
  console.log('📝 Test 3: Récupération des notes (/notes)');
  try {
    const response = await fetch(`${BASE_URL}/notes`, {
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

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Endpoint /folders
  console.log('📂 Test 4: Récupération des dossiers (/folders)');
  try {
    const response = await fetch(`${BASE_URL}/folders`, {
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

// Lancer les tests
testApiKeyAuth().catch(console.error);
