// Utilise fetch natif (Node.js 18+)

async function testClasseurSimple() {
  try {
    console.log('🧪 Test simple création classeur...');
    
    const response = await fetch('http://localhost:3000/api/v1/classeur/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Test Simple ${Date.now()}`,
        user_id: "3223651c-5580-4471-affb-b3f4456bd729",
        position: 0,
        emoji: "📁",
        color: "#808080"
      })
    });
    
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    
    const result = await response.json();
    console.log('📊 Réponse complète:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Succès!');
    } else {
      console.log('❌ Erreur!');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testClasseurSimple(); 