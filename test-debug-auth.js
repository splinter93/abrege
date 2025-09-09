const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_API_KEY = 'scrivia-api-key-2024';

async function testDebugAuth() {
  console.log('🧪 Test de debug de l\'authentification via endpoint...\n');

  try {
    console.log('📡 Test de l\'endpoint de debug auth');
    console.log(`   URL: ${BASE_URL}/api/debug/auth`);
    console.log(`   Clé d'API: ${TEST_API_KEY}`);
    
    const response = await fetch(`${BASE_URL}/api/debug/auth`, {
      method: 'GET',
      headers: {
        'X-API-Key': TEST_API_KEY,
        'X-Client-Type': 'test'
      }
    });

    console.log(`\n📊 Réponse HTTP: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    console.log(`\n📄 Corps de la réponse (${responseText.length} caractères):`);
    
    try {
      const result = JSON.parse(responseText);
      console.log(JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('\n✅ Debug auth réussi !');
        if (result.authResult?.success) {
          console.log('   🎯 Authentification par clé d\'API fonctionne');
          console.log(`   User ID: ${result.authResult.userId}`);
          console.log(`   Auth Type: ${result.authResult.authType}`);
        } else {
          console.log('   ❌ Authentification par clé d\'API échoue');
          console.log(`   Erreur: ${result.authResult?.error}`);
        }
      } else {
        console.log('\n❌ Debug auth échoué');
        console.log(`   Erreur: ${result.error}`);
      }
    } catch (parseError) {
      console.log('❌ Erreur parsing JSON:', parseError.message);
      console.log('Raw response:', responseText);
    }

  } catch (error) {
    console.error('\n💥 Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testDebugAuth();
