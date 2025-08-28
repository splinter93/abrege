// Test simple de l'endpoint GET /notes
const API_KEY = 'scrivia_d3eb49152b63e591e97c67de8f28d079c3e0927e1aa6c4e14db25d7389dac695';
const BASE_URL = 'http://localhost:3000/api/v2';

async function testGetNotes() {
  try {
    console.log('🧪 Test GET /notes uniquement...');
    
    const response = await fetch(`${BASE_URL}/notes?limit=5`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
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

testGetNotes();
