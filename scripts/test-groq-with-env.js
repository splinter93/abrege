// 🧪 Test Groq avec Chargement Explicite des Variables d'Environnement

const fs = require('fs');
const path = require('path');

console.log('🧪 Test Groq avec Chargement Explicite des Variables d\'Environnement...\n');

// Charger les variables d'environnement depuis .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    console.log('📋 Fichier .env.local trouvé');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
          console.log(`   ✅ ${key}: ${value.substring(0, 10)}...`);
        }
      }
    });
  } else {
    console.log('❌ Fichier .env.local non trouvé');
  }
}

// Charger les variables
loadEnvFile();

// Vérifier les variables d'environnement
console.log('\n📋 Vérification des variables d\'environnement:');

const requiredEnvVars = [
  'GROQ_API_KEY',
  'TOGETHER_API_KEY',
  'DEEPSEEK_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const envStatus = {};
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const status = value ? '✅' : '❌';
  const displayValue = value ? `${value.substring(0, 10)}...` : 'Non défini';
  console.log(`   ${status} ${envVar}: ${displayValue}`);
  envStatus[envVar] = !!value;
});

// Test de l'API Groq si la clé est disponible
async function testGroqAPI() {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    console.log('\n❌ GROQ_API_KEY manquante');
    console.log('📝 Vérifiez que la variable est définie dans .env.local');
    return;
  }

  console.log('\n🔧 Test de connectivité à l\'API Groq...');
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
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
async function testGroqCall() {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    console.log('\n❌ Impossible de tester l\'appel sans clé API');
    return;
  }

  console.log('\n🧪 Test d\'appel simple...');
  
  const payload = {
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant IA simple et utile.'
      },
      {
        role: 'user',
        content: 'Dis-moi bonjour en français.'
      }
    ],
    stream: false,
    temperature: 0.7,
    max_completion_tokens: 100,
    top_p: 0.9
  };

  try {
    console.log('📤 Envoi de la requête...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
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

// Exécuter les tests
async function runTests() {
  await testGroqAPI();
  await testGroqCall();
  
  console.log('\n✅ Tests terminés !');
  console.log('🎯 Si les tests passent, l\'API Groq fonctionne correctement.');
}

runTests(); 