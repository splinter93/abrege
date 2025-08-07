// 🧪 Test de l'API Route avec Logs Détaillés
// Vérifier quelle clé est réellement utilisée

console.log('🧪 Test de l\'API Route avec Logs Détaillés...\n');

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

// Test de l'API route avec différents providers
async function testAPIWithProvider(provider) {
  console.log(`\n🧪 Test avec provider: ${provider}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        message: 'Test simple',
        provider: provider,
        context: {
          sessionId: 'test-session-' + Date.now()
        }
      })
    });

    console.log(`📊 Statut ${provider}:`, response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${provider} fonctionne !`);
      console.log('📝 Réponse:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`❌ Erreur ${provider}:`, errorText);
    }
  } catch (error) {
    console.log(`❌ Erreur de connexion ${provider}:`, error.message);
  }
}

// Test de l'API route avec agent spécifique
async function testAPIWithAgent(agentId) {
  console.log(`\n🧪 Test avec agent ID: ${agentId}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        message: 'Test avec agent spécifique',
        agentId: agentId,
        context: {
          sessionId: 'test-session-' + Date.now()
        }
      })
    });

    console.log(`📊 Statut avec agent:`, response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Agent fonctionne !');
      console.log('📝 Réponse:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur avec agent:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion avec agent:', error.message);
  }
}

// Test de simulation de la logique de sélection des clés
function testKeySelection() {
  console.log('\n🧪 Test de la logique de sélection des clés...');
  
  // Simuler la logique de l'API route
  const isGptOss = true; // Pour GPT-OSS
  const useGroq = isGptOss;
  
  const groqKey = process.env.GROQ_API_KEY;
  const togetherKey = process.env.TOGETHER_API_KEY;
  
  const apiKey = useGroq ? groqKey : togetherKey;
  const providerName = useGroq ? 'Groq' : 'Together AI';
  
  console.log('🔧 Configuration simulée:');
  console.log(`   - isGptOss: ${isGptOss}`);
  console.log(`   - useGroq: ${useGroq}`);
  console.log(`   - providerName: ${providerName}`);
  console.log(`   - groqKey: ${groqKey ? groqKey.substring(0, 10) + '...' : 'Non défini'}`);
  console.log(`   - togetherKey: ${togetherKey ? togetherKey.substring(0, 10) + '...' : 'Non défini'}`);
  console.log(`   - apiKey sélectionnée: ${apiKey ? apiKey.substring(0, 10) + '...' : 'Non défini'}`);
  
  if (!apiKey) {
    console.log('❌ PROBLÈME: Aucune clé API sélectionnée !');
  } else {
    console.log('✅ Clé API sélectionnée correctement');
  }
}

// Exécuter tous les tests
async function runAllTests() {
  testKeySelection();
  
  // Test avec différents providers
  await testAPIWithProvider('groq');
  await testAPIWithProvider('together');
  await testAPIWithProvider('deepseek');
  
  // Test avec l'agent Groq Simple
  await testAPIWithAgent('948b4187-31e0-4070-a0aa-2fa7350e034c');
  
  console.log('\n✅ Tests terminés !');
  console.log('🎯 Vérifiez les logs pour identifier le problème.');
}

runAllTests(); 