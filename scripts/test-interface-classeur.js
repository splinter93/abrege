// Utilise fetch natif (Node.js 18+)

async function testInterfaceClasseur() {
  try {
    console.log('🧪 Test création classeur via interface...');
    
    // Simuler les données envoyées par l'interface
    const newClasseurData = {
      name: `Test Interface ${Date.now()}`,
      user_id: "3223651c-5580-4471-affb-b3f4456bd729",
      position: 0,
      emoji: "📁",
      color: "#808080",
    };
    
    console.log('📋 Données envoyées:', newClasseurData);
    
    const response = await fetch('http://localhost:3000/api/ui/classeur/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newClasseurData)
    });
    
    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('📊 Réponse:', JSON.stringify(result, null, 2));
    
    console.log('✅ Succès! Classeur créé:', result.classeur.name);
    console.log('🎯 ID:', result.classeur.id);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testInterfaceClasseur(); 