// Test de l'endpoint POST /notes
const API_KEY = 'scrivia_d3eb49152b63e591e97c67de8f28d079c3e0927e1aa6c4e14db25d7389dac695';
const BASE_URL = 'http://localhost:3000/api/v2';

async function testPostNotes() {
  try {
    console.log('🧪 Test POST /notes...');
    
    const response = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        source_title: 'Note de test API V2 corrigée',
        markdown_content: '# Test API V2\n\nCette note teste l\'API V2 maintenant corrigée.\n\n## Fonctionnalités\n- ✅ GET /notes fonctionne\n- 🔄 POST /notes en test\n- 🎯 Plus d\'erreur 500',
        classeur_id: '552334a9-f012-41f3-a5eb-74ab9ab713ed'
      })
    });

    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Succès création note:', data.note?.source_title);
      console.log('🆔 ID de la note:', data.note?.id);
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur création:', errorText);
      
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

testPostNotes();
