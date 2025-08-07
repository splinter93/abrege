// 🧪 Test Simple de l'API Route
// Test de l'API route avec une approche simplifiée

console.log('🧪 Test Simple de l\'API Route...\n');

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

// Test simple de l'API route
async function testSimpleAPI() {
  console.log('📋 Test simple de l\'API route...');
  
  try {
    // Test avec un token de test
    const response = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        message: 'Bonjour',
        provider: 'groq',
        context: {
          sessionId: 'test-session-' + Date.now()
        }
      })
    });

    console.log('📊 Statut:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API route fonctionne !');
      console.log('📝 Réponse:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

// Test de l'endpoint de santé
async function testHealthEndpoint() {
  console.log('\n📋 Test de l\'endpoint de santé...');
  
  try {
    const response = await fetch('http://localhost:3000/api/health');
    console.log('📊 Statut santé:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Serveur en bonne santé !');
    } else {
      console.log('❌ Serveur non accessible');
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

// Test de l'endpoint de debug
async function testDebugEndpoint() {
  console.log('\n📋 Test de l\'endpoint de debug...');
  
  try {
    const response = await fetch('http://localhost:3000/api/debug/env');
    console.log('📊 Statut debug:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Debug accessible !');
      console.log('📝 Variables d\'environnement:', Object.keys(data));
    } else {
      console.log('❌ Debug non accessible');
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

// Test direct de l'API Groq sans authentification
async function testGroqDirect() {
  console.log('\n📋 Test direct de l\'API Groq...');
  
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    console.log('❌ GROQ_API_KEY manquante');
    return;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'user',
            content: 'Dis-moi bonjour en français.'
          }
        ],
        stream: false,
        temperature: 0.7,
        max_completion_tokens: 100
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Groq directe fonctionne !');
      console.log('📝 Réponse:', data.choices?.[0]?.message?.content);
    } else {
      console.log('❌ Erreur API Groq:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Erreur API Groq:', error.message);
  }
}

// Exécuter tous les tests
async function runAllTests() {
  await testHealthEndpoint();
  await testDebugEndpoint();
  await testGroqDirect();
  await testSimpleAPI();
  
  console.log('\n✅ Tests terminés !');
  console.log('🎯 Si l\'API Groq directe fonctionne, le problème est dans l\'authentification.');
}

runAllTests(); 