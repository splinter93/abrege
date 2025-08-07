// 🧪 Test Direct de l'API DeepSeek
// Vérifier si la clé DeepSeek fonctionne

console.log('🧪 Test Direct de l\'API DeepSeek...\n');

// Charger les variables d'environnement
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    console.log('📋 Chargement des variables d\'environnement...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();

// Vérifier la clé DeepSeek
const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

console.log('📋 Vérification de la clé DeepSeek:');
console.log(`   - DEEPSEEK_API_KEY: ${deepseekApiKey ? deepseekApiKey.substring(0, 10) + '...' : 'Non défini'}`);

if (!deepseekApiKey) {
  console.log('❌ DEEPSEEK_API_KEY manquante');
  console.log('📝 Ajoutez dans .env.local:');
  console.log('   DEEPSEEK_API_KEY=sk-votre_cle_api_deepseek_ici');
  console.log('🔗 Obtenez une clé sur: https://platform.deepseek.com/');
  return;
}

// Test de connectivité à l'API DeepSeek
async function testDeepSeekConnectivity() {
  console.log('\n🔧 Test de connectivité à l\'API DeepSeek...');
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connectivité OK (', response.status, ')');
      console.log('📋 Modèles disponibles:', data.data?.length || 0);
      
      if (data.data) {
        data.data.forEach(model => {
          console.log(`   - ${model.id}`);
        });
      }
    } else {
      console.log('❌ Erreur de connectivité:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

// Test d'appel simple
async function testDeepSeekCall() {
  console.log('\n🧪 Test d\'appel simple...');
  
  const payload = {
    model: 'deepseek-chat',
    messages: [
      {
        role: 'user',
        content: 'Dis-moi bonjour en français.'
      }
    ],
    stream: false,
    temperature: 0.7,
    max_tokens: 100
  };

  try {
    console.log('📤 Envoi de la requête...');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Appel réussi !');
      console.log('📝 Réponse:', data.choices?.[0]?.message?.content || 'Pas de contenu');
      console.log('📊 Usage:', data.usage);
    } else {
      console.log('❌ Erreur d\'appel:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur d\'appel:', error.message);
  }
}

// Test avec le modèle DeepSeek Reasoner
async function testDeepSeekReasoner() {
  console.log('\n🧪 Test avec DeepSeek Reasoner...');
  
  const payload = {
    model: 'deepseek-reasoner',
    messages: [
      {
        role: 'user',
        content: 'Dis-moi bonjour en français.'
      }
    ],
    stream: false,
    temperature: 0.7,
    max_tokens: 100
  };

  try {
    console.log('📤 Envoi de la requête avec DeepSeek Reasoner...');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ DeepSeek Reasoner fonctionne !');
      console.log('📝 Réponse:', data.choices?.[0]?.message?.content || 'Pas de contenu');
      console.log('📊 Usage:', data.usage);
    } else {
      console.log('❌ Erreur DeepSeek Reasoner:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur DeepSeek Reasoner:', error.message);
  }
}

// Exécuter tous les tests
async function runTests() {
  await testDeepSeekConnectivity();
  await testDeepSeekCall();
  await testDeepSeekReasoner();
  
  console.log('\n✅ Tests terminés !');
  console.log('🎯 Si les tests passent, l\'API DeepSeek fonctionne correctement.');
}

runTests(); 