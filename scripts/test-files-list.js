/**
 * 🧪 Test de l'endpoint /api/v2/files/list
 * 
 * Vérifie que l'endpoint fonctionne correctement avec authentification
 */

const API_BASE = 'http://localhost:3001'; // Port 3001 selon votre terminal

async function testFilesList() {
  console.log('🧪 Test de l\'endpoint /api/v2/files/list\n');

  try {
    // 🔍 Test 1: Sans authentification (doit échouer)
    console.log('1️⃣ Test sans authentification...');
    const response1 = await fetch(`${API_BASE}/api/v2/files/list`);
    console.log(`   Status: ${response1.status} (attendu: 401)`);
    console.log(`   ✅ ${response1.status === 401 ? 'PASS' : 'FAIL'}\n`);

    // 🔍 Test 2: Avec authentification (doit réussir)
    console.log('2️⃣ Test avec authentification...');
    console.log('   ⚠️  Ce test nécessite un token valide');
    console.log('   💡 Connectez-vous d\'abord dans l\'app pour obtenir un token\n');

    // 🔍 Test 3: Test HEAD (informations sur l'endpoint)
    console.log('3️⃣ Test HEAD endpoint...');
    const response3 = await fetch(`${API_BASE}/api/v2/files/list`, { method: 'HEAD' });
    console.log(`   Status: ${response3.status} (attendu: 200)`);
    
    if (response3.ok) {
      const info = await response3.text();
      console.log('   📋 Informations endpoint:');
      console.log('   ', JSON.parse(info));
      console.log(`   ✅ PASS\n`);
    } else {
      console.log(`   ❌ FAIL\n`);
    }

    // 🔍 Test 4: Test avec paramètres de requête
    console.log('4️⃣ Test avec paramètres de requête...');
    const response4 = await fetch(`${API_BASE}/api/v2/files/list?limit=10&offset=0`);
    console.log(`   Status: ${response4.status} (attendu: 401 sans auth)`);
    console.log(`   ✅ ${response4.status === 401 ? 'PASS' : 'FAIL'}\n`);

    console.log('🎯 Tests terminés !');
    console.log('💡 Pour tester avec authentification, connectez-vous dans l\'app');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
  }
}

// 🚀 Exécution des tests
testFilesList();
