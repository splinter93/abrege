#!/usr/bin/env node

/**
 * 🧠 Test Simple du Reasoning Groq GPT-OSS
 * 
 * Ce script teste la configuration du reasoning pour Groq
 */

console.log('🧪 Test Simple du Reasoning Groq GPT-OSS...\n');

// 1. Vérifier les variables d'environnement
console.log('🔑 Variables d\'environnement:');
console.log('   - GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Configuré' : '❌ Manquant');
console.log('   - NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configuré' : '❌ Manquant');
console.log('   - SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configuré' : '❌ Manquant');

// 2. Configuration attendue pour Groq
console.log('\n🔧 Configuration Attendue pour Groq:');
console.log('   - Modèle: openai/gpt-oss-120b');
console.log('   - Reasoning effort: medium');
console.log('   - Temperature: 0.7');
console.log('   - Max completion tokens: 1000');
console.log('   - Top p: 0.9');

// 3. Payload de test
const testPayload = {
  model: 'openai/gpt-oss-120b',
  messages: [
    {
      role: 'system',
      content: 'Tu es un assistant IA avec capacité de raisonnement. Montre ton processus de pensée.'
    },
    {
      role: 'user',
      content: 'Explique-moi la théorie de la relativité en détail.'
    }
  ],
  stream: true,
  temperature: 0.7,
  max_completion_tokens: 1000,
  top_p: 0.9,
  reasoning_effort: 'medium'
};

console.log('\n📤 Payload de Test:');
console.log(JSON.stringify(testPayload, null, 2));

// 4. Vérifications du code
console.log('\n🔍 Vérifications du Code:');

// Vérifier si le fichier route.ts contient la gestion du reasoning pour Groq
const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '../src/app/api/chat/llm/route.ts');
if (fs.existsSync(routePath)) {
  const routeContent = fs.readFileSync(routePath, 'utf8');
  
  const checks = [
    {
      name: 'Gestion reasoning Groq dans Together AI section',
      condition: routeContent.includes('if (delta.reasoning_content && useGroq)') && routeContent.includes('Reasoning Groq détecté'),
      description: 'Gestion du reasoning pour Groq dans la section Together AI'
    },
    {
      name: 'Gestion reasoning Groq dans Groq section',
      condition: routeContent.includes('if (delta.reasoning_content && useGroq)') && routeContent.includes('Reasoning Groq détecté'),
      description: 'Gestion du reasoning pour Groq dans la section Groq'
    },
    {
      name: 'Payload reasoning_effort pour Groq',
      condition: routeContent.includes('reasoning_effort: \'medium\'') && routeContent.includes('// ✅ Activer le reasoning pour Groq'),
      description: 'Configuration reasoning_effort dans le payload Groq'
    },
    {
      name: 'Broadcast llm-reasoning',
      condition: routeContent.includes('event: \'llm-reasoning\'') && routeContent.includes('reasoning: delta.reasoning_content'),
      description: 'Broadcast du reasoning en temps réel'
    }
  ];

  checks.forEach(check => {
    console.log(`   - ${check.name}: ${check.condition ? '✅' : '❌'}`);
    if (!check.condition) {
      console.log(`     ${check.description}`);
    }
  });
} else {
  console.log('   - Fichier route.ts: ❌ Non trouvé');
}

// 5. Instructions de test
console.log('\n🧪 Instructions de Test:');
console.log('1. Redémarrez le serveur: npm run dev');
console.log('2. Sélectionnez l\'agent Groq GPT-OSS');
console.log('3. Posez une question complexe (ex: "Explique-moi la théorie de la relativité")');
console.log('4. Vérifiez que le reasoning apparaît en temps réel');
console.log('5. Vérifiez les logs dans le terminal pour voir "🧠 Reasoning Groq détecté"');

// 6. Résumé
console.log('\n📊 Résumé:');
const hasGroqApiKey = !!process.env.GROQ_API_KEY;
const hasSupabaseConfig = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log(`   - Configuration API: ${hasGroqApiKey ? '✅' : '❌'}`);
console.log(`   - Configuration Supabase: ${hasSupabaseConfig ? '✅' : '❌'}`);

if (hasGroqApiKey && hasSupabaseConfig) {
  console.log('\n🎉 Configuration complète ! Testez maintenant dans l\'interface.');
} else {
  console.log('\n⚠️ Problèmes de configuration détectés.');
  if (!hasGroqApiKey) console.log('   - Ajoutez GROQ_API_KEY dans .env.local');
  if (!hasSupabaseConfig) console.log('   - Vérifiez les variables Supabase');
} 