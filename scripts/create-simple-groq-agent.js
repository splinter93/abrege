// 🧪 Création d'un Agent Groq Simple
// Agent minimal pour tester Groq sans prompt complexe

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

// Agent Groq Simple
const simpleGroqAgent = {
  name: 'Groq Simple',
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

async function createSimpleGroqAgent() {
  try {
    console.log('🧪 Création de l\'agent Groq Simple...');
    
    // Vérifier si l'agent existe déjà
    const { data: existingAgent, error: checkError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('name', simpleGroqAgent.name)
      .single();

    if (existingAgent) {
      console.log('⚠️ Agent existe déjà:', existingAgent.name);
      console.log('🔄 Mise à jour de l\'agent...');
      
      const { data: updatedAgent, error: updateError } = await supabase
        .from('agents')
        .update({
          ...simpleGroqAgent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (updateError) {
        console.log('❌ Erreur mise à jour:', updateError);
        return;
      }

      console.log('✅ Agent mis à jour:', updatedAgent.name);
      console.log('   ID:', updatedAgent.id);
      console.log('   Provider:', updatedAgent.provider);
      console.log('   Modèle:', updatedAgent.model);
    } else {
      console.log('🆕 Création d\'un nouvel agent...');
      
      const { data: newAgent, error: insertError } = await supabase
        .from('agents')
        .insert(simpleGroqAgent)
        .select()
        .single();

      if (insertError) {
        console.log('❌ Erreur création:', insertError);
        return;
      }

      console.log('✅ Agent créé:', newAgent.name);
      console.log('   ID:', newAgent.id);
      console.log('   Provider:', newAgent.provider);
      console.log('   Modèle:', newAgent.model);
    }

    console.log('\n📋 Configuration de l\'agent:');
    console.log('   - Nom:', simpleGroqAgent.name);
    console.log('   - Provider:', simpleGroqAgent.provider);
    console.log('   - Modèle:', simpleGroqAgent.model);
    console.log('   - Instructions:', simpleGroqAgent.system_instructions);
    console.log('   - Temperature:', simpleGroqAgent.temperature);
    console.log('   - Max tokens:', simpleGroqAgent.max_tokens);

  } catch (error) {
    console.log('❌ Erreur générale:', error);
  }
}

// Exécuter la création
createSimpleGroqAgent(); 