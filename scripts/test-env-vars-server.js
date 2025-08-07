// 🧪 Test des Variables d'Environnement Côté Serveur
// Vérifier si les variables sont bien disponibles dans le contexte Next.js

console.log('🧪 Test des Variables d\'Environnement Côté Serveur...\n');

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

// Vérifier les variables d'environnement
console.log('📋 Variables d\'environnement disponibles:');

const requiredEnvVars = [
  'GROQ_API_KEY',
  'TOGETHER_API_KEY',
  'DEEPSEEK_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const status = value ? '✅' : '❌';
  const displayValue = value ? `${value.substring(0, 10)}...` : 'Non défini';
  console.log(`   ${status} ${envVar}: ${displayValue}`);
});

// Test de simulation de l'API route
console.log('\n🧪 Simulation de l\'API route...');

// Simuler la logique de l'API route
const useGroq = true; // Pour GPT-OSS
const apiKey = useGroq 
  ? process.env.GROQ_API_KEY
  : process.env.TOGETHER_API_KEY;

console.log('🔧 Configuration simulée:');
console.log(`   - useGroq: ${useGroq}`);
console.log(`   - apiKey: ${apiKey ? apiKey.substring(0, 10) + '...' : 'Non défini'}`);

if (!apiKey) {
  console.log('❌ PROBLÈME: apiKey non défini !');
  console.log('🔧 Cela expliquerait pourquoi les APIs ne reçoivent pas les secrets.');
} else {
  console.log('✅ apiKey défini correctement');
}

// Test de l'API Groq avec la clé
async function testGroqWithKey() {
  console.log('\n🧪 Test de l\'API Groq avec la clé...');
  
  if (!apiKey) {
    console.log('❌ Impossible de tester sans clé API');
    return;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'user',
            content: 'Test simple'
          }
        ],
        stream: false,
        temperature: 0.7,
        max_completion_tokens: 50
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Groq fonctionne avec la clé !');
      console.log('📝 Réponse:', data.choices?.[0]?.message?.content);
    } else {
      console.log('❌ Erreur API Groq:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

testGroqWithKey();

console.log('\n✅ Test terminé !');
console.log('🎯 Si la clé est définie mais que l\'API route ne fonctionne pas,');
console.log('   le problème est dans le chargement des variables côté serveur Next.js.'); 