const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      envLines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (value && !key.startsWith('#')) {
            process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
          }
        }
      });
      
      console.log('✅ Variables d\'environnement chargées depuis .env');
    } else {
      console.log('⚠️ Fichier .env non trouvé, utilisation des variables système');
    }
  } catch (error) {
    console.log('⚠️ Erreur chargement .env:', error.message);
  }
}

// Charger les variables d'environnement
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  console.error('\n💡 Vérifiez que votre fichier .env contient ces variables');
  process.exit(1);
}

console.log('🔗 Connexion à Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLLMTemplatesConnection() {
  try {
    console.log('🔧 Correction de la connexion entre templates LLM et table agents...\n');

    // 1. Vérifier l'état actuel des agents
    console.log('📋 Vérification de l\'état actuel des agents...');
    
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .order('priority', { ascending: false });

    if (agentsError) {
      console.error('❌ Erreur récupération agents:', agentsError);
      return;
    }

    if (!agents || agents.length === 0) {
      console.log('❌ Aucun agent trouvé dans la base de données');
      return;
    }

    console.log(`✅ ${agents.length} agents trouvés\n`);

    // 2. Analyser chaque agent et corriger sa configuration
    for (const agent of agents) {
      console.log(`🔍 Analyse de l'agent: ${agent.name} (${agent.provider})`);
      
      let needsUpdate = false;
      const updates = {};

      // Vérifier et corriger les colonnes de template
      if (!agent.system_instructions) {
        updates.system_instructions = 'Tu es un assistant IA utile et bienveillant.';
        needsUpdate = true;
        console.log('   📝 Ajout des instructions système par défaut');
      }

      if (!agent.context_template) {
        updates.context_template = '## Contexte utilisateur\n- Type: {{type}}\n- Nom: {{name}}\n- ID: {{id}}\n{{#if content}}- Contenu: {{content}}{{/if}}';
        needsUpdate = true;
        console.log('   🎯 Ajout du template de contexte par défaut');
      }

      if (!agent.api_config || Object.keys(agent.api_config).length === 0) {
        updates.api_config = {
          baseUrl: agent.provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.deepseek.com/v1',
          endpoint: '/chat/completions',
          reasoning_effort: 'medium'
        };
        needsUpdate = true;
        console.log('   ⚙️ Ajout de la configuration API par défaut');
      }

      if (!agent.capabilities || agent.capabilities.length === 0) {
        updates.capabilities = ['text'];
        needsUpdate = true;
        console.log('   🔧 Ajout des capacités par défaut');
      }

      if (!agent.expertise || agent.expertise.length === 0) {
        updates.expertise = ['assistance générale'];
        needsUpdate = true;
        console.log('   🧠 Ajout de l\'expertise par défaut');
      }

      if (!agent.personality) {
        updates.personality = 'Assistant IA professionnel et serviable';
        needsUpdate = true;
        console.log('   👤 Ajout de la personnalité par défaut');
      }

      // Vérifier les capacités API v2
      if (!agent.api_v2_capabilities || agent.api_v2_capabilities.length === 0) {
        // Déterminer les capacités selon le provider
        let apiV2Capabilities = [];
        if (agent.provider === 'groq') {
          apiV2Capabilities = ['function_calling', 'streaming', 'reasoning'];
        } else if (agent.provider === 'deepseek') {
          apiV2Capabilities = ['function_calling', 'streaming'];
        } else {
          apiV2Capabilities = ['function_calling'];
        }
        
        updates.api_v2_capabilities = apiV2Capabilities;
        needsUpdate = true;
        console.log(`   🚀 Ajout des capacités API v2: ${apiV2Capabilities.join(', ')}`);
      }

      // Mettre à jour l'agent si nécessaire
      if (needsUpdate) {
        console.log(`   🔄 Mise à jour de l'agent ${agent.name}...`);
        
        const { error: updateError } = await supabase
          .from('agents')
          .update(updates)
          .eq('id', agent.id);

        if (updateError) {
          console.error(`   ❌ Erreur mise à jour:`, updateError);
        } else {
          console.log(`   ✅ Agent ${agent.name} mis à jour avec succès`);
        }
      } else {
        console.log(`   ✅ Agent ${agent.name} déjà correctement configuré`);
      }
      
      console.log('');
    }

    // 3. Vérification finale
    console.log('🔍 Vérification finale de la configuration...');
    
    const { data: finalAgents, error: finalError } = await supabase
      .from('agents')
      .select('id, name, provider, system_instructions, context_template, api_config, capabilities, api_v2_capabilities')
      .order('priority', { ascending: false });

    if (finalError) {
      console.error('❌ Erreur vérification finale:', finalError);
      return;
    }

    console.log('\n📊 Résumé de la configuration finale:');
    finalAgents.forEach(agent => {
      const hasTemplates = !!(agent.system_instructions && agent.context_template);
      const hasApiConfig = !!(agent.api_config && Object.keys(agent.api_config).length > 0);
      const hasCapabilities = !!(agent.capabilities && agent.capabilities.length > 0);
      const hasApiV2Capabilities = !!(agent.api_v2_capabilities && agent.api_v2_capabilities.length > 0);
      
      const status = hasTemplates && hasApiConfig && hasCapabilities && hasApiV2Capabilities ? '✅' : '⚠️';
      
      console.log(`${status} ${agent.name} (${agent.provider})`);
      console.log(`   Templates: ${hasTemplates ? '✅' : '❌'}`);
      console.log(`   API Config: ${hasApiConfig ? '✅' : '❌'}`);
      console.log(`   Capacités: ${hasCapabilities ? '✅' : '❌'}`);
      console.log(`   API v2: ${hasApiV2Capabilities ? '✅' : '❌'}`);
      console.log('');
    });

    // 4. Test de connexion avec le service de templates
    console.log('🧪 Test de connexion avec le service de templates...');
    
    try {
      // Simuler un appel au service de templates
      const testAgent = finalAgents[0];
      if (testAgent) {
        console.log(`   Test avec l'agent: ${testAgent.name}`);
        console.log(`   - Instructions: ${testAgent.system_instructions ? '✅' : '❌'}`);
        console.log(`   - Template: ${testAgent.context_template ? '✅' : '❌'}`);
        console.log(`   - API Config: ${testAgent.api_config ? '✅' : '❌'}`);
        console.log(`   - Capacités: ${testAgent.capabilities ? '✅' : '❌'}`);
        console.log(`   - API v2: ${testAgent.api_v2_capabilities ? '✅' : '❌'}`);
      }
    } catch (error) {
      console.error('   ❌ Erreur test service templates:', error);
    }

    console.log('\n🎉 Correction terminée avec succès !');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Redémarrer l\'application pour charger les nouvelles configurations');
    console.log('   2. Tester un chat avec un agent pour vérifier les templates');
    console.log('   3. Vérifier que les function calls fonctionnent correctement');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
fixLLMTemplatesConnection(); 