#!/usr/bin/env node

/**
 * Debug des permissions - Pour identifier pourquoi l'erreur 403 se produit
 */

console.log('🔍 Debug des permissions - Erreur 403');
console.log('=====================================');

async function debugPermissions() {
  try {
    console.log('📡 Test de l\'API avec authentification simulée...');
    
    // Simuler une requête avec un token (même si invalide)
    const response = await fetch('http://localhost:3000/api/v2/note/test/content', {
      headers: {
        'Authorization': 'Bearer fake-token-for-debug',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ 401 - Token invalide (normal avec fake token)');
    } else if (response.status === 403) {
      console.log('❌ 403 - Problème de permissions (même avec token)');
      console.log('🔍 Cela indique un problème dans la logique de vérification');
    } else if (response.ok) {
      console.log('✅ 200 - API accessible (inattendu avec fake token)');
    } else {
      console.log('⚠️ Status inattendu:', response.status);
    }
    
    // Test de l'API tree aussi
    console.log('\n📡 Test de l\'API tree...');
    const treeResponse = await fetch('http://localhost:3000/api/v2/classeur/test/tree', {
      headers: {
        'Authorization': 'Bearer fake-token-for-debug',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Tree Status: ${treeResponse.status} ${treeResponse.statusText}`);
    
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

// Exécuter le debug
debugPermissions().then(() => {
  console.log('\n🏁 Debug terminé');
  console.log('\n💡 Analyse des résultats :');
  console.log('   - 401 = Token invalide (normal)');
  console.log('   - 403 = Problème de permissions (à corriger)');
  console.log('   - 200 = API accessible (inattendu)');
  console.log('\n🔧 Actions recommandées :');
  console.log('   1. Vérifie les logs du serveur pour plus de détails');
  console.log('   2. Teste dans le navigateur avec un vrai compte');
  console.log('   3. Vérifie que la note existe dans la base de données');
  
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 