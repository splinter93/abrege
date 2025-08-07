// 🧪 Création d'un Agent Groq avec Reasoning Activé
// Agent Groq avec reasoning pour tester le thinking

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variables d\'environnement Supabase manquantes');
  console.log('   NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Agent Groq avec Reasoning
const groqReasoningAgent = {
  name: 'Groq Reasoning',
  provider: 'groq',
  model: 'openai/gpt-oss-120b',
  system_instructions: 'Tu es un assistant IA sympa, qui parle en mode street.',
  temperature: 0.7,
  max_tokens: 1000,
  top_p: 0.9,
  api_v2_capabilities: ['function_calls', 'streaming', 'reasoning'],
  api_config: {
    baseUrl: 'https://api.groq.com/openai/v1',
    endpoint: '/chat/completions',
    reasoning_effort: 'low',
    enable_thinking: true,
    result_format: 'message'
  },
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

async function createGroqReasoningAgent() {
  try {
    console.log('🧪 Création de l\'agent Groq Reasoning...');
    
    // Vérifier si l'agent existe déjà
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('*')
      .eq('name', 'Groq Reasoning')
      .single();

    if (existingAgent) {
      console.log('🔄 Agent existant trouvé, mise à jour...');
      
      const { data, error } = await supabase
        .from('agents')
        .update({
          ...groqReasoningAgent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (error) {
        console.log('❌ Erreur mise à jour:', error);
        return;
      }

      console.log('✅ Agent mis à jour: Groq Reasoning');
      console.log('   ID:', data.id);
      console.log('   Provider:', data.provider);
      console.log('   Modèle:', data.model);
    } else {
      console.log('🆕 Création d\'un nouvel agent...');
      
      const { data, error } = await supabase
        .from('agents')
        .insert(groqReasoningAgent)
        .select()
        .single();

      if (error) {
        console.log('❌ Erreur création:', error);
        return;
      }

      console.log('✅ Agent créé: Groq Reasoning');
      console.log('   ID:', data.id);
      console.log('   Provider:', data.provider);
      console.log('   Modèle:', data.model);
    }

    console.log('\n📋 Configuration de l\'agent:');
    console.log('   - Nom: Groq Reasoning');
    console.log('   - Provider: groq');
    console.log('   - Modèle: openai/gpt-oss-120b');
    console.log('   - Instructions: Tu es un assistant IA avec capacité de raisonnement. Montre ton processus de pensée.');
    console.log('   - Temperature: 0.7');
    console.log('   - Max tokens: 1000');
    console.log('   - Reasoning effort: medium');
    console.log('   - Enable thinking: true');

  } catch (error) {
    console.log('❌ Erreur:', error);
  }
}

createGroqReasoningAgent(); 