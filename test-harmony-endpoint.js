/**
 * Test simple de l'endpoint Harmony
 */

async function testHarmonyEndpoint() {
  console.log('🧪 Test de l\'endpoint Harmony...');
  
  try {
    const response = await fetch('http://localhost:3000/api/chat/llm-harmony', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    console.log('OK:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response:', data);
    } else {
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

testHarmonyEndpoint();
