// 🔍 Audit Complet de Tous les Providers
// Vérification de la configuration et fonctionnement de tous les providers

const fs = require('fs');
const path = require('path');

console.log('🔍 Audit Complet de Tous les Providers...\n');

// Charger les variables d'environnement depuis .env.local
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
  } else {
    console.log('❌ Fichier .env.local non trouvé');
  }
}

// Charger les variables
loadEnvFile();

// 1. Vérification des variables d'environnement
console.log('📋 1. Vérification des variables d\'environnement:');

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

// 2. Vérification des providers disponibles
console.log('\n🔧 2. Vérification des providers disponibles:');

const providerFiles = [
  'src/services/llm/providers/implementations/groq.ts',
  'src/services/llm/providers/implementations/together.ts',
  'src/services/llm/providers/implementations/deepseek.ts',
  'src/services/llm/providers/implementations/synesia.ts'
];

const providerChecks = [];

providerFiles.forEach(providerFile => {
  try {
    const content = fs.readFileSync(providerFile, 'utf8');
    const providerName = path.basename(providerFile, '.ts');
    
    const checks = [
      {
        name: 'Fichier existe',
        condition: true,
        description: `Fichier ${providerName}.ts présent`
      },
      {
        name: 'Classe Provider',
        condition: content.includes('export class') && content.includes('Provider'),
        description: 'Classe Provider exportée'
      },
      {
        name: 'Configuration',
        condition: content.includes('DEFAULT_') && content.includes('_CONFIG'),
        description: 'Configuration par défaut définie'
      },
      {
        name: 'Méthode call',
        condition: content.includes('async call('),
        description: 'Méthode call implémentée'
      },
      {
        name: 'Validation',
        condition: content.includes('validateConfig') || content.includes('isAvailable'),
        description: 'Méthode de validation présente'
      }
    ];

    checks.forEach(check => {
      const status = check.condition ? '✅' : '❌';
      console.log(`   ${status} ${providerName}: ${check.description}`);
      providerChecks.push({
        provider: providerName,
        check: check.name,
        status: check.condition
      });
    });

  } catch (error) {
    console.log(`   ❌ ${path.basename(providerFile)}: Fichier non trouvé`);
  }
});

// 3. Vérification de l'API Route
console.log('\n🔧 3. Vérification de l\'API Route:');

const apiRoutePath = 'src/app/api/chat/llm/route.ts';
try {
  const apiContent = fs.readFileSync(apiRoutePath, 'utf8');
  
  const apiChecks = [
    {
      name: 'Import GroqProvider',
      condition: apiContent.includes('import { DeepSeekProvider, TogetherProvider, GroqProvider }'),
      description: 'GroqProvider importé'
    },
    {
      name: 'Logique DeepSeek',
      condition: apiContent.includes('if (currentProvider.id === \'deepseek\')'),
      description: 'Logique DeepSeek présente'
    },
    {
      name: 'Logique Groq',
      condition: apiContent.includes('else if (currentProvider.id === \'groq\')'),
      description: 'Logique Groq présente'
    },
    {
      name: 'Logique Together',
      condition: apiContent.includes('Together AI') || apiContent.includes('together'),
      description: 'Logique Together présente'
    },
    {
      name: 'Provider Manager',
      condition: apiContent.includes('LLMProviderManager'),
      description: 'Provider Manager utilisé'
    },
    {
      name: 'Streaming',
      condition: apiContent.includes('stream: true'),
      description: 'Streaming configuré'
    },
    {
      name: 'Function Calls',
      condition: apiContent.includes('tool_choice: \'auto\'') || apiContent.includes('tools'),
      description: 'Function calls supportés'
    }
  ];

  apiChecks.forEach(check => {
    const status = check.condition ? '✅' : '❌';
    console.log(`   ${status} ${check.name}: ${check.description}`);
  });

} catch (error) {
  console.log('❌ Erreur lors de la vérification de l\'API route:', error.message);
}

// 4. Vérification des agents dans la base de données
console.log('\n📋 4. Vérification des agents dans la base de données:');

async function checkAgents() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('   ❌ Variables Supabase manquantes - impossible de vérifier les agents');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, name, provider, model, is_active')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('   ❌ Erreur récupération agents:', error.message);
      return;
    }

    if (!agents || agents.length === 0) {
      console.log('   ⚠️ Aucun agent trouvé dans la base de données');
      return;
    }

    console.log(`   📊 ${agents.length} agent(s) trouvé(s):`);
    
    agents.forEach(agent => {
      const status = agent.is_active ? '✅' : '❌';
      console.log(`   ${status} ${agent.name} (${agent.provider} - ${agent.model})`);
    });

    // Vérifier les providers utilisés
    const providers = [...new Set(agents.map(a => a.provider))];
    console.log(`   🔧 Providers utilisés: ${providers.join(', ')}`);

  } catch (error) {
    console.log('   ❌ Erreur vérification agents:', error.message);
  }
}

// 5. Test de connectivité des APIs
console.log('\n🧪 5. Test de connectivité des APIs:');

async function testAPIConnectivity() {
  const apis = [
    {
      name: 'Groq',
      url: 'https://api.groq.com/openai/v1/models',
      key: process.env.GROQ_API_KEY,
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      }
    },
    {
      name: 'Together AI',
      url: 'https://api.together.xyz/v1/models',
      key: process.env.TOGETHER_API_KEY,
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`
      }
    },
    {
      name: 'DeepSeek',
      url: 'https://api.deepseek.com/v1/models',
      key: process.env.DEEPSEEK_API_KEY,
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      }
    }
  ];

  for (const api of apis) {
    if (!api.key) {
      console.log(`   ❌ ${api.name}: Clé API manquante`);
      continue;
    }

    try {
      const response = await fetch(api.url, {
        method: 'GET',
        headers: api.headers
      });

      if (response.ok) {
        console.log(`   ✅ ${api.name}: Connectivité OK (${response.status})`);
      } else {
        console.log(`   ❌ ${api.name}: Erreur ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${api.name}: Erreur de connexion - ${error.message}`);
    }
  }
}

// 6. Recommandations
console.log('\n🔧 6. Recommandations:');

const recommendations = [];

// Vérifier les variables d'environnement manquantes
const missingEnvVars = requiredEnvVars.filter(envVar => !envStatus[envVar]);
if (missingEnvVars.length > 0) {
  recommendations.push({
    priority: '🔴 CRITIQUE',
    issue: 'Variables d\'environnement manquantes',
    solution: `Ajouter dans .env.local: ${missingEnvVars.join(', ')}`,
    impact: 'Providers non fonctionnels'
  });
}

// Vérifier les agents
if (!envStatus['NEXT_PUBLIC_SUPABASE_URL'] || !envStatus['SUPABASE_SERVICE_ROLE_KEY']) {
  recommendations.push({
    priority: '🟡 MOYEN',
    issue: 'Configuration Supabase manquante',
    solution: 'Configurer NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY',
    impact: 'Impossible de vérifier les agents'
  });
}

// Recommandations générales
recommendations.push({
  priority: '🟢 FAIBLE',
  issue: 'Test des providers',
  solution: 'Créer un agent simple pour chaque provider et tester',
  impact: 'Validation du fonctionnement'
});

recommendations.forEach(rec => {
  console.log(`   ${rec.priority} ${rec.issue}: ${rec.solution} - Impact: ${rec.impact}`);
});

// 7. Actions recommandées
console.log('\n📝 7. Actions recommandées:');

const actions = [
  '1. Créer l\'agent Groq Simple: node scripts/create-simple-groq-agent.js',
  '2. Vérifier les agents: node scripts/list-agents.js',
  '3. Tester chaque provider individuellement',
  '4. Vérifier les logs du serveur pour les erreurs',
  '5. Tester avec des questions simples'
];

actions.forEach(action => {
  console.log(`   ${action}`);
});

// Exécuter les vérifications asynchrones
(async () => {
  await checkAgents();
  await testAPIConnectivity();
  
  console.log('\n✅ Audit terminé !');
  console.log('🎯 Vérifiez les recommandations ci-dessus pour résoudre les problèmes.');
})(); 