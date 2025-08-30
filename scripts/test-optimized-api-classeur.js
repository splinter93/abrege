// Utilise fetch natif (Node.js 18+)

async function testOptimizedApiClasseur() {
  try {
    console.log('🧪 Test OptimizedApi pour classeur...');
    
    // Simuler l'OptimizedApi
    const startTime = Date.now();
    
    const classeurData = {
      name: `Test OptimizedApi ${Date.now()}`,
      user_id: "3223651c-5580-4471-affb-b3f4456bd729",
      position: 0,
      emoji: "📁",
      color: "#808080"
    };
    
    console.log('[OptimizedApi] 📚 Création classeur optimisée');
    console.log('[OptimizedApi] 📋 Données:', classeurData);
    
    // Appel API
    const response = await fetch('http://localhost:3000/api/ui/classeur/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classeurData)
    });

    console.log('[OptimizedApi] 📊 Status:', response.status);
    console.log('[OptimizedApi] 📊 Status Text:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OptimizedApi] ❌ Réponse API: ${response.status} ${response.statusText}`);
      console.error(`[OptimizedApi] ❌ Contenu erreur: ${errorText}`);
      throw new Error(`Erreur création classeur: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const apiTime = Date.now() - startTime;
    console.log(`[OptimizedApi] ✅ API terminée en ${apiTime}ms`);
    console.log(`[OptimizedApi] 📋 Réponse API:`, result);

    // Simuler la mise à jour de Zustand
    console.log(`[OptimizedApi] 🔄 Ajout classeur à Zustand:`, result.classeur);
    
    const totalTime = Date.now() - startTime;
    console.log(`[OptimizedApi] ✅ Classeur ajouté à Zustand + polling déclenché en ${totalTime}ms total`);
    
    return result;
    
  } catch (error) {
    console.error('[OptimizedApi] ❌ Erreur création classeur:', error);
    throw error;
  }
}

testOptimizedApiClasseur(); 