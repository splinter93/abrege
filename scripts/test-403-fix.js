#!/usr/bin/env node

/**
 * Test de la correction de l'erreur 403 sur l'API note content
 */

console.log('🧪 Test de la correction de l\'erreur 403');
console.log('=====================================');

async function test403Fix() {
  try {
    console.log('📡 Test de l\'API note content...');
    
    // Test sans authentification (devrait retourner 401)
    const response = await fetch('http://localhost:3000/api/v2/note/test/content');
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ API fonctionne - Authentification requise (normal)');
      console.log('🔐 L\'erreur 401 est attendue sans token d\'authentification');
    } else if (response.status === 403) {
      console.log('⚠️ Erreur 403 - Problème de permissions (à vérifier)');
    } else if (response.ok) {
      console.log('✅ API accessible sans authentification');
    } else {
      console.log('⚠️ Status inattendu:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

// Exécuter le test
test403Fix().then(() => {
  console.log('\n🏁 Test terminé');
  console.log('\n💡 Pour tester complètement :');
  console.log('   1. Va sur http://localhost:3000/private/dossiers');
  console.log('   2. Connecte-toi avec ton compte');
  console.log('   3. Essaie d\'ouvrir une note');
  console.log('   4. Vérifie qu\'il n\'y a plus d\'erreur 403');
  console.log('   5. Vérifie que le contenu des notes s\'affiche correctement');
  
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 