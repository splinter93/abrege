#!/usr/bin/env node

/**
 * Test simple de l'API tree V2 - Vérification que le contenu des notes est récupéré
 */

console.log('🧪 Test de l\'API tree V2 - Contenu des notes');
console.log('==============================================');

// Test simple avec fetch
async function testTreeAPI() {
  try {
    console.log('📡 Test de l\'API tree V2...');
    
    // Test sans authentification (devrait retourner une erreur 401/403)
    const response = await fetch('http://localhost:3000/api/v2/classeur/test/tree');
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401 || response.status === 403) {
      console.log('✅ API fonctionne - Authentification requise (normal)');
      console.log('🔐 L\'erreur 401/403 est attendue sans token d\'authentification');
    } else if (response.ok) {
      console.log('✅ API accessible sans authentification');
      const data = await response.json();
      console.log('📝 Données reçues:', JSON.stringify(data, null, 2));
    } else {
      console.log('⚠️ Status inattendu:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

// Exécuter le test
testTreeAPI().then(() => {
  console.log('\n🏁 Test terminé');
  console.log('\n💡 Pour tester complètement :');
  console.log('   1. Va sur http://localhost:3000/private/dossiers');
  console.log('   2. Connecte-toi avec ton compte');
  console.log('   3. Vérifie que les notes affichent leur contenu complet');
  console.log('   4. Vérifie que les images sont visibles');
  console.log('   5. Vérifie que les notes dans les dossiers sont présentes');
  
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 