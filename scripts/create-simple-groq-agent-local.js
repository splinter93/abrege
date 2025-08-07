// 🧪 Création d'un Agent Groq Simple (Local)
// Agent minimal pour tester Groq sans dépendance à Supabase

console.log('🧪 Création d\'un Agent Groq Simple (Local)...\n');

// Agent Groq Simple
const simpleGroqAgent = {
  name: 'Groq Simple',
  description: 'Agent Groq simple pour tests',
  provider: 'groq',
  model: 'openai/gpt-oss-120b',
  system_instructions: 'Tu es un assistant IA simple et utile.',
  temperature: 0.7,
  max_tokens: 1000,
  top_p: 0.9,
  api_v2_capabilities: ['function_calls', 'streaming'],
  api_config: {
    baseUrl: 'https://api.groq.com/openai/v1',
    endpoint: '/chat/completions',
    enable_thinking: false,
    result_format: 'message'
  },
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log('📋 Configuration de l\'agent Groq Simple:');
console.log('   - Nom:', simpleGroqAgent.name);
console.log('   - Provider:', simpleGroqAgent.provider);
console.log('   - Modèle:', simpleGroqAgent.model);
console.log('   - Instructions:', simpleGroqAgent.system_instructions);
console.log('   - Temperature:', simpleGroqAgent.temperature);
console.log('   - Max tokens:', simpleGroqAgent.max_tokens);
console.log('   - API Config:', JSON.stringify(simpleGroqAgent.api_config, null, 2));

console.log('\n📝 Instructions pour créer l\'agent:');
console.log('1. Ajouter les variables d\'environnement dans .env.local:');
console.log('   GROQ_API_KEY=gsk_votre_cle_api_groq_ici');
console.log('   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co');
console.log('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

console.log('\n2. Exécuter le script avec Supabase:');
console.log('   node scripts/create-simple-groq-agent.js');

console.log('\n3. Ou créer l\'agent manuellement dans la base de données avec:');
console.log('   INSERT INTO agents (name, description, provider, model, system_instructions, temperature, max_tokens, top_p, api_v2_capabilities, api_config, is_active, created_at, updated_at)');
console.log('   VALUES (\'Groq Simple\', \'Agent Groq simple pour tests\', \'groq\', \'openai/gpt-oss-120b\', \'Tu es un assistant IA simple et utile.\', 0.7, 1000, 0.9, \'["function_calls", "streaming"]\', \'{"baseUrl": "https://api.groq.com/openai/v1", "endpoint": "/chat/completions", "enable_thinking": false, "result_format": "message"}\', true, NOW(), NOW());');

console.log('\n✅ Configuration de l\'agent prête !');
console.log('🎯 Une fois l\'agent créé, testez-le avec une question simple.'); 