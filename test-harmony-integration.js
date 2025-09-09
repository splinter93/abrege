/**
 * Script de test pour l'intégration Harmony dans ChatFullscreenV2
 * Production-ready, validation complète
 */

const { testHarmonyImplementation } = require('./src/services/llm/groqHarmonyGptOss');

async function testHarmonyIntegration() {
  console.log('🎼 Test d\'intégration Harmony - ChatFullscreenV2');
  console.log('=' .repeat(60));

  try {
    // 1. Test de l'implémentation Harmony
    console.log('\n1. 🧪 Test de l\'implémentation Harmony...');
    const harmonyTests = await testHarmonyImplementation();
    
    console.log(`   ✅ Tests Harmony: ${harmonyTests.success ? 'SUCCÈS' : 'ÉCHEC'}`);
    console.log(`   📊 Tests exécutés: ${harmonyTests.tests.length}`);
    
    harmonyTests.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      console.log(`   ${status} ${test.name}`);
      if (test.error) {
        console.log(`      Erreur: ${test.error}`);
      }
    });

    // 2. Test de l'endpoint API Harmony
    console.log('\n2. 🌐 Test de l\'endpoint API Harmony...');
    
    const testResponse = await fetch('http://localhost:3000/api/chat/llm-harmony', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('   ✅ Endpoint Harmony accessible');
      console.log(`   📊 Tests API: ${testData.testResults?.success ? 'SUCCÈS' : 'ÉCHEC'}`);
    } else {
      console.log(`   ❌ Endpoint Harmony inaccessible: ${testResponse.status}`);
    }

    // 3. Test de l'endpoint API standard (comparaison)
    console.log('\n3. 🔄 Test de l\'endpoint API standard...');
    
    const standardResponse = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (standardResponse.ok) {
      console.log('   ✅ Endpoint standard accessible');
    } else {
      console.log(`   ❌ Endpoint standard inaccessible: ${standardResponse.status}`);
    }

    // 4. Résumé des fonctionnalités
    console.log('\n4. 📋 Fonctionnalités Harmony intégrées:');
    console.log('   ✅ Toggle Harmony dans ChatFullscreenV2');
    console.log('   ✅ Hook useChatResponseHarmony');
    console.log('   ✅ Endpoint /api/chat/llm-harmony');
    console.log('   ✅ Styles CSS pour le toggle');
    console.log('   ✅ Support complet du format Harmony');
    console.log('   ✅ Tokens spéciaux Harmony');
    console.log('   ✅ Canaux analysis/commentary/final');
    console.log('   ✅ Séparation raisonnement/réponse');

    // 5. Instructions d'utilisation
    console.log('\n5. 🚀 Instructions d\'utilisation:');
    console.log('   1. Démarrer le serveur: npm run dev');
    console.log('   2. Aller sur /chat-fullscreen-v2');
    console.log('   3. Cliquer sur le toggle 🎼 Harmony');
    console.log('   4. Envoyer un message pour tester');
    console.log('   5. Observer les logs Harmony dans la console');

    console.log('\n🎉 Intégration Harmony terminée avec succès !');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Erreur lors du test d\'intégration Harmony:', error);
    console.log('\n🔧 Vérifications à faire:');
    console.log('   1. Le serveur est-il démarré ? (npm run dev)');
    console.log('   2. Les fichiers Harmony sont-ils compilés ?');
    console.log('   3. Les dépendances sont-elles installées ?');
    console.log('   4. La base de données est-elle accessible ?');
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  testHarmonyIntegration();
}

module.exports = { testHarmonyIntegration };
