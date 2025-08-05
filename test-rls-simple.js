async function testRLSSimple() {
  console.log('🔍 Test simple de la correction RLS');
  
  // Token simulé (remplace par un vrai token si disponible)
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZGhqd2xhYW1wc3BvcW5jdWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjI1NzUsImV4cCI6MjA2NjQzODU3NX0.6mdYhESYSyuIANGI9PS9OxBU1RWP1FHSvbFCVFCig2w';
  
  const endpoints = [
    {
      name: 'Liste classeurs',
      url: 'http://localhost:3000/api/v2/classeurs',
      method: 'GET'
    },
    {
      name: 'Création classeur',
      url: 'http://localhost:3000/api/v2/classeur/create',
      method: 'POST',
      body: {
        name: 'Test Classeur RLS Simple',
        description: 'Test de la correction RLS'
      }
    }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Test: ${endpoint.name}`);
    
    try {
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`,
          'X-Client-Type': 'test'
        }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const response = await fetch(endpoint.url, options);
      
      console.log(`📊 Status: ${response.status}`);
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${endpoint.name} fonctionne !`);
        if (endpoint.name === 'Création classeur' && result.classeur) {
          console.log(`📝 Classeur créé avec ID: ${result.classeur.id}`);
        }
      } else {
        console.log(`❌ ${endpoint.name} échoue:`, result.error);
        
        // Analyser l'erreur
        if (result.error && result.error.includes('row-level security')) {
          console.log('🔍 Problème RLS détecté - la correction n\'a pas fonctionné');
        } else if (result.error && result.error.includes('Token')) {
          console.log('🔍 Problème d\'authentification - token invalide (normal avec un token simulé)');
        } else {
          console.log('🔍 Autre problème');
        }
      }
      
    } catch (error) {
      console.error(`❌ Erreur lors du test de ${endpoint.name}:`, error.message);
    }
  }
  
  console.log('\n📋 Résumé :');
  console.log('- Si vous voyez "Token invalide", c\'est normal avec un token simulé');
  console.log('- Si vous voyez "row-level security", la correction n\'a pas fonctionné');
  console.log('- Si vous voyez d\'autres erreurs, il y a un autre problème');
}

testRLSSimple(); 