/**
 * Script de test pour l'API Synesia
 * Test avec clé API fournie
 */

const SYNESIA_API_KEY = 'apiKey.70.MDZjMjlhZGEtOTcwOS00YjlhLTk5ZTItMDQxMzRlNjNiMDBh';
const SYNESIA_PROJECT_ID = 'proj_test'; // On verra si c'est nécessaire
const SYNESIA_CALLABLE_ID = 'a62f3fb5-17ee-488c-b775-b57fc89c617e';

// Payload simple de test
const payload = {
  callable_id: SYNESIA_CALLABLE_ID,
  args: "Bonjour ! Réponds juste 'Hello' pour tester.",
  settings: {
    history_messages: []
  }
};

console.log('🚀 Test API Synesia\n');
console.log('📋 Configuration:');
console.log(`   • URL: https://api.synesia.app/execution?wait=true`);
console.log(`   • API Key: ${SYNESIA_API_KEY.substring(0, 15)}...`);
console.log('\n📤 Payload:');
console.log(JSON.stringify(payload, null, 2));
console.log('\n⏳ Envoi de la requête...\n');

fetch('https://api.synesia.app/execution?wait=true', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `ApiKey ${SYNESIA_API_KEY}`,
  },
  body: JSON.stringify(payload)
})
  .then(async response => {
    console.log(`📥 Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Headers:`);
    console.log(`   • Content-Type: ${response.headers.get('content-type')}`);
    console.log();
    
    const text = await response.text();
    
    if (!response.ok) {
      console.error('❌ Erreur API:\n');
      console.error(text);
      console.error('\n💡 Suggestions:');
      console.error('   • Vérifier que la clé API est valide');
      console.error('   • Vérifier que le callable_id existe');
      console.error('   • Vérifier si X-Project-ID est requis');
      return;
    }
    
    console.log('✅ Succès !\n');
    
    try {
      const data = JSON.parse(text);
      console.log('📊 Réponse JSON:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.result) {
        console.log('\n💬 Réponse LLM:');
        console.log(data.result);
      } else if (data.response) {
        console.log('\n💬 Réponse LLM:');
        console.log(data.response);
      }
    } catch (e) {
      console.log('📄 Réponse (texte brut):');
      console.log(text);
    }
  })
  .catch(error => {
    console.error('❌ Erreur réseau:\n');
    console.error(error.message);
  });


