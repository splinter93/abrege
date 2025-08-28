const API_KEY = 'your-api-key-here'; // Remplacez par votre vraie clé API
const BASE_URL = 'https://scrivia.app/api/v2';

async function testCreateNote() {
  try {
    console.log('🧪 Test de création de note via API v2...');
    
    const response = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        source_title: 'Note de test API v2',
        markdown_content: '# Note de test\n\nCette note a été créée via l\'API v2.\n\n## Contenu\n- Test 1\n- Test 2\n\n**Bold text** et *italic text*.',
        classeur_id: '552334a9-f012-41f3-a5eb-74ab9ab713ed'
      })
    });

    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Succès!');
      console.log('📝 Données reçues:', JSON.stringify(data, null, 2));
    } else {
      const errorData = await response.text();
      console.log('❌ Erreur!');
      console.log('🚨 Données d\'erreur:', errorData);
    }
  } catch (error) {
    console.error('💥 Erreur de connexion:', error.message);
  }
}

async function testListNotes() {
  try {
    console.log('\n🧪 Test de récupération des notes via API v2...');
    
    const response = await fetch(`${BASE_URL}/notes`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    console.log(`📊 Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Succès!');
      console.log(`📝 Nombre de notes: ${data.notes?.length || 0}`);
      if (data.notes && data.notes.length > 0) {
        console.log('📋 Première note:', {
          id: data.notes[0].id,
          title: data.notes[0].source_title,
          created: data.notes[0].created_at
        });
      }
    } else {
      const errorData = await response.text();
      console.log('❌ Erreur!');
      console.log('🚨 Données d\'erreur:', errorData);
    }
  } catch (error) {
    console.error('💥 Erreur de connexion:', error.message);
  }
}

// Exécuter les tests
async function runTests() {
  console.log('🚀 Démarrage des tests API v2...\n');
  
  await testCreateNote();
  await testListNotes();
  
  console.log('\n🏁 Tests terminés!');
}

// Vérifier que l'API key est configurée
if (API_KEY === 'your-api-key-here') {
  console.log('⚠️  Veuillez configurer votre clé API dans le script');
  console.log('🔑 Remplacez "your-api-key-here" par votre vraie clé API');
} else {
  runTests();
}
