// Test rapide pour vérifier que l'erreur 500 est corrigée
const API_KEY = 'your-api-key-here'; // Remplacez par votre vraie clé API
const BASE_URL = 'http://localhost:3000/api/v2'; // Test local

async function testFixedAPI() {
  try {
    console.log('🧪 Test de l\'API corrigée...');
    
    // Test 1: GET /notes (qui causait l'erreur 500)
    console.log('\n1️⃣ Test GET /notes...');
    const getResponse = await fetch(`${BASE_URL}/notes?limit=5`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    console.log(`📊 Status: ${getResponse.status}`);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('✅ GET /notes fonctionne:', data.notes?.length || 0, 'notes récupérées');
    } else {
      const errorText = await getResponse.text();
      console.log('❌ GET /notes erreur:', errorText);
    }

    // Test 2: POST /notes (création)
    console.log('\n2️⃣ Test POST /notes...');
    const postResponse = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        source_title: 'Note de test corrigée',
        markdown_content: '# Test\n\nCette note teste l\'API corrigée.',
        classeur_id: '552334a9-f012-41f3-a5eb-74ab9ab713ed'
      })
    });

    console.log(`📊 Status: ${postResponse.status}`);
    
    if (postResponse.ok) {
      const data = await postResponse.json();
      console.log('✅ POST /notes fonctionne:', data.note?.source_title);
    } else {
      const errorText = await getResponse.text();
      console.log('❌ POST /notes erreur:', errorText);
    }

  } catch (error) {
    console.error('💥 Erreur de connexion:', error.message);
  }
}

// Vérifier que l'API key est configurée
if (API_KEY === 'your-api-key-here') {
  console.log('⚠️  Veuillez configurer votre clé API dans le script');
  console.log('🔑 Remplacez "your-api-key-here" par votre vraie clé API');
  console.log('📋 Utilisez une de vos clés: Chat GPT ou Donna');
} else {
  testFixedAPI();
}
