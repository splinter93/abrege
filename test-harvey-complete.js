const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_API_KEY = 'scrivia_18a125ef9357757ea43e5577ec096024f2f72ef8546dd1a1e93638303e026455';

async function testHarveyComplete() {
  console.log('🧪 Test complet de Harvey avec différents tool calls...\n');

  const tests = [
    {
      name: 'Liste des classeurs',
      message: 'Liste tous mes classeurs',
      expectedKeywords: ['classeur', 'Classeur', 'table', '|']
    },
    {
      name: 'Création d\'une note',
      message: 'Crée une note de test intitulée "Test Harvey"',
      expectedKeywords: ['note', 'créé', 'créée', 'Test Harvey']
    },
    {
      name: 'Recherche de contenu',
      message: 'Recherche "test" dans mes notes',
      expectedKeywords: ['recherche', 'résultat', 'trouvé']
    }
  ];

  for (const test of tests) {
    console.log(`📡 Test: ${test.name}`);
    console.log(`   Message: ${test.message}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/v2/agents/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': TEST_API_KEY,
          'X-Client-Type': 'test'
        },
        body: JSON.stringify({
          ref: 'harvey',
          input: test.message
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`   ✅ Succès (${response.status})`);
        console.log(`   Agent: ${result.data?.agent_name}`);
        console.log(`   Temps: ${result.data?.execution_time}ms`);
        
        const responseText = result.data?.response || '';
        console.log(`   Réponse: ${responseText.substring(0, 150)}...`);
        
        // Vérifier les mots-clés attendus
        const hasExpectedKeywords = test.expectedKeywords.some(keyword => 
          responseText.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasExpectedKeywords) {
          console.log(`   🎯 Tool call confirmé - Mots-clés attendus trouvés`);
        } else {
          console.log(`   ⚠️  Tool call ambigu - Mots-clés attendus non trouvés`);
        }
        
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Échec (${response.status})`);
        console.log(`   Erreur: ${errorText}`);
      }
      
    } catch (error) {
      console.log(`   💥 Erreur: ${error.message}`);
    }
    
    console.log(''); // Ligne vide entre les tests
  }

  console.log('🏁 Tests terminés !');
}

// Exécuter les tests
testHarveyComplete();
