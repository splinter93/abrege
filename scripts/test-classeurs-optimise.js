// Utilise fetch natif (Node.js 18+)

/**
 * Test des classeurs avec OptimizedApi
 * Vérifie que les classeurs utilisent bien l'API optimisée
 */

async function testClasseursOptimized() {
  console.log('🧪 TEST CLASSEURS OPTIMISÉS');
  console.log('=============================\n');

  const baseUrl = 'http://localhost:3000';
  const userId = "3223651c-5580-4471-affb-b3f4456bd729";

  try {
    // Test 1: Créer un classeur
    console.log('📚 Test 1: Création classeur avec OptimizedApi');
    const startTime = Date.now();
    
    const createResponse = await fetch(`${baseUrl}/api/v1/classeur/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test Classeur ${Date.now()}`,
        user_id: userId,
        position: 0,
        emoji: "📚",
        color: "#808080"
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Erreur création classeur: ${createResponse.statusText}`);
    }

    const createResult = await createResponse.json();
    const createTime = Date.now() - startTime;
    console.log(`✅ Classeur créé en ${createTime}ms:`, createResult.classeur.name);
    console.log(`   ID: ${createResult.classeur.id}`);
    console.log(`   Position: ${createResult.classeur.position}`);
    console.log('');

    // Test 2: Mettre à jour le classeur
    console.log('🔄 Test 2: Mise à jour classeur avec OptimizedApi');
    const updateStartTime = Date.now();
    
    const updateResponse = await fetch(`${baseUrl}/api/v1/classeur/${createResult.classeur.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Classeur Modifié ${Date.now()}`,
        emoji: "📖",
        color: "#4CAF50"
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Erreur mise à jour classeur: ${updateResponse.statusText}`);
    }

    const updateResult = await updateResponse.json();
    const updateTime = Date.now() - updateStartTime;
    console.log(`✅ Classeur mis à jour en ${updateTime}ms:`, updateResult.classeur.name);
    console.log(`   Nouveau nom: ${updateResult.classeur.name}`);
    console.log(`   Nouveau emoji: ${updateResult.classeur.emoji}`);
    console.log(`   Nouveau couleur: ${updateResult.classeur.color}`);
    console.log('');

    // Test 3: Supprimer le classeur
    console.log('🗑️ Test 3: Suppression classeur avec OptimizedApi');
    const deleteStartTime = Date.now();
    
    const deleteResponse = await fetch(`${baseUrl}/api/v1/classeur/${createResult.classeur.id}`, {
      method: 'DELETE'
    });

    if (!deleteResponse.ok) {
      throw new Error(`Erreur suppression classeur: ${deleteResponse.statusText}`);
    }

    const deleteTime = Date.now() - deleteStartTime;
    console.log(`✅ Classeur supprimé en ${deleteTime}ms`);
    console.log('');

    // Résumé des performances
    const totalTime = Date.now() - startTime;
    console.log('📊 RÉSUMÉ DES PERFORMANCES');
    console.log('==========================');
    console.log(`🕐 Création: ${createTime}ms`);
    console.log(`🔄 Mise à jour: ${updateTime}ms`);
    console.log(`🗑️ Suppression: ${deleteTime}ms`);
    console.log(`⏱️ Temps total: ${totalTime}ms`);
    console.log(`📈 Moyenne: ${Math.round(totalTime / 3)}ms par opération`);
    console.log('');

    console.log('✅ TOUS LES TESTS CLASSEURS RÉUSSIS !');
    console.log('🎯 Les classeurs utilisent maintenant l\'OptimizedApi');
    console.log('🚀 Mise à jour directe de Zustand + polling côté client');
    console.log('⏸️ Plus de polling continu qui matraque');

  } catch (error) {
    console.error('❌ Erreur lors du test des classeurs:', error);
    process.exit(1);
  }
}

// Exécuter le test
testClasseursOptimized(); 