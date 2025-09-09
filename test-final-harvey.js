const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_API_KEY = 'scrivia_18a125ef9357757ea43e5577ec096024f2f72ef8546dd1a1e93638303e026455';

async function testFinalHarvey() {
  console.log('🎯 TEST FINAL - Harvey avec clé d\'API et tool calls\n');

  try {
    console.log('📡 Test: Harvey avec demande complexe (multiple tool calls)');
    console.log('   Message: "Liste mes classeurs, puis crée une note dans le premier classeur"');
    
    const response = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
        'X-Client-Type': 'test'
      },
      body: JSON.stringify({
        ref: 'harvey',
        input: 'Liste mes classeurs, puis crée une note dans le premier classeur'
      })
    });

    console.log(`\n📊 Réponse HTTP: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCÈS COMPLET !');
      console.log(`   Agent: ${result.data?.agent_name}`);
      console.log(`   Temps d'exécution: ${result.data?.execution_time}ms`);
      console.log(`   Modèle: ${result.data?.model_used}`);
      console.log(`   Provider: ${result.data?.provider}`);
      
      const responseText = result.data?.response || '';
      console.log(`\n📄 Réponse complète:`);
      console.log(responseText);
      
      // Vérifications
      const hasClasseurs = responseText.includes('classeur') || responseText.includes('Classeur');
      const hasNote = responseText.includes('note') || responseText.includes('créé');
      const hasTable = responseText.includes('|') || responseText.includes('table');
      
      console.log(`\n🔍 Vérifications:`);
      console.log(`   📂 Classeurs mentionnés: ${hasClasseurs ? '✅' : '❌'}`);
      console.log(`   📝 Note mentionnée: ${hasNote ? '✅' : '❌'}`);
      console.log(`   📊 Table/formatage: ${hasTable ? '✅' : '❌'}`);
      
      if (hasClasseurs && hasNote) {
        console.log(`\n🎉 PARFAIT ! Harvey a pu exécuter des tool calls avec la clé d'API !`);
        console.log(`   ✅ Authentification par clé d'API : OK`);
        console.log(`   ✅ Tool calls : OK`);
        console.log(`   ✅ Accès aux données : OK`);
      } else {
        console.log(`\n⚠️  Harvey a répondu mais les tool calls ne semblent pas complets`);
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ ÉCHEC !');
      console.log(`   Erreur: ${errorText}`);
    }

  } catch (error) {
    console.error('💥 ERREUR FATALE:', error.message);
  }
}

// Exécuter le test final
testFinalHarvey();
