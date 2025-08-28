const API_KEY = 'your-api-key-here'; // Remplacez par votre vraie clé API
const BASE_URL = 'http://localhost:3000/api/v2'; // Test local

async function testCreateNote() {
  try {
    console.log('🧪 Test de création de note...');
    
    const response = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        source_title: 'Note de debug',
        markdown_content: '# Debug\n\nTest de création...',
        classeur_id: '552334a9-f012-41f3-a5eb-74ab9ab713ed'
      })
    });

    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Succès:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.log('❌ Erreur JSON:', errorJson);
      } catch (e) {
        console.log('❌ Erreur texte brut:', errorText);
      }
    }
  } catch (error) {
    console.error('💥 Erreur de connexion:', error.message);
  }
}

// Vérifier que l'API key est configurée
if (API_KEY === 'your-api-key-here') {
  console.log('⚠️  Veuillez configurer votre clé API dans le script');
  console.log('🔑 Remplacez "your-api-key-here" par votre vraie clé API');
} else {
  testCreateNote();
}
