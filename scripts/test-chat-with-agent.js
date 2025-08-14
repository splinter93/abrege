// Script pour tester le chat avec un agent spécifique
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testChatWithAgent() {
  try {
    console.log('🧪 TEST DU CHAT AVEC AGENT');
    console.log('==========================');

    // 1. Récupérer un agent de test
    console.log('\n1️⃣ **RÉCUPÉRATION D\'UN AGENT DE TEST**');
    
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('provider', 'groq')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (agentError) {
      console.error('❌ Erreur lors de la récupération de l\'agent:', agentError);
      return;
    }

    console.log(`✅ Agent sélectionné: ${agent.name}`);
    console.log(`   Provider: ${agent.provider}`);
    console.log(`   Model: ${agent.model}`);
    console.log(`   Instructions: ${agent.system_instructions ? '✅' : '❌'}`);
    console.log(`   Capacités: ${agent.api_v2_capabilities?.length || 0}`);
    console.log(`   Reasoning: ${agent.reasoning_effort || 'Non configuré'}`);

    if (!agent.system_instructions) {
      console.log('⚠️ Cet agent n\'a pas d\'instructions système !');
      console.log('   Exécutez d\'abord: node scripts/fix-agent-instructions.js');
      return;
    }

    // 2. Créer un token d'authentification de test
    console.log('\n2️⃣ **AUTHENTIFICATION DE TEST**');
    
    // Note: En production, vous devriez utiliser un vrai utilisateur
    // Pour ce test, on simule juste la structure
    const testUserToken = 'test-token-' + Date.now();
    const testSessionId = 'test-session-' + Date.now();

    console.log(`   Token de test: ${testUserToken}`);
    console.log(`   Session ID: ${testSessionId}`);

    // 3. Préparer la requête de test
    console.log('\n3️⃣ **PRÉPARATION DE LA REQUÊTE**');
    
    const testMessage = 'Dis-moi qui tu es et quelles sont tes capacités.';
    
    const requestBody = {
      message: testMessage,
      context: {
        sessionId: testSessionId,
        type: 'chat_session',
        name: 'Test Session',
        id: testSessionId
      },
      history: [],
      provider: agent.provider,
      channelId: 'test-channel'
    };

    console.log(`   Message de test: "${testMessage}"`);
    console.log(`   Provider: ${agent.provider}`);

    // 4. Simuler l'appel à l'API (sans vraiment l'appeler)
    console.log('\n4️⃣ **SIMULATION DE L\'APPEL API**');
    
    console.log('📤 Requête qui serait envoyée:');
    console.log(JSON.stringify(requestBody, null, 2));

    // 5. Analyser les instructions de l'agent
    console.log('\n5️⃣ **ANALYSE DES INSTRUCTIONS DE L\'AGENT**');
    
    console.log('📝 Instructions système de l\'agent:');
    console.log('─'.repeat(80));
    console.log(agent.system_instructions);
    console.log('─'.repeat(80));

    // 6. Vérifier les capacités API v2
    console.log('\n6️⃣ **CAPACITÉS API V2**');
    
    if (agent.api_v2_capabilities && agent.api_v2_capabilities.length > 0) {
      console.log('🔧 Capacités disponibles:');
      agent.api_v2_capabilities.forEach((capability, index) => {
        console.log(`   ${index + 1}. ${capability}`);
      });
    } else {
      console.log('⚠️ Aucune capacité API v2 configurée');
    }

    // 7. Test de rendu du template
    console.log('\n7️⃣ **TEST DE RENDU DU TEMPLATE**');
    
    try {
      // Simuler le rendu du template comme dans AgentTemplateService
      let renderedContent = agent.system_instructions;
      
      if (agent.context_template) {
        const context = {
          type: 'chat_session',
          name: 'Test Session',
          id: testSessionId,
          content: ''
        };
        
        // Remplacement simple des variables
        let contextualContent = agent.context_template
          .replace(/\{\{type\}\}/g, context.type || '')
          .replace(/\{\{name\}\}/g, context.name || '')
          .replace(/\{\{id\}\}/g, context.id || '')
          .replace(/\{\{content\}\}/g, context.content || '');
        
        // Gestion conditionnelle simple
        if (!context.content) {
          contextualContent = contextualContent.replace(/\{\{#if content\}\}(.*?)\{\{\/if\}\}/g, '');
        } else {
          contextualContent = contextualContent.replace(/\{\{#if content\}\}(.*?)\{\{\/if\}\}/g, '$1');
        }
        
        renderedContent = `${renderedContent}\n\n${contextualContent}`;
      }
      
      console.log('✅ Template rendu avec succès');
      console.log(`📏 Longueur: ${renderedContent.length} caractères`);
      console.log('📝 Preview (premiers 200 caractères):');
      console.log(renderedContent.substring(0, 200) + '...');
      
    } catch (error) {
      console.error('❌ Erreur lors du rendu du template:', error);
    }

    // 8. Recommandations
    console.log('\n8️⃣ **RECOMMANDATIONS**');
    
    if (agent.system_instructions.length < 100) {
      console.log('⚠️ Les instructions sont très courtes. Considérez les enrichir.');
    }
    
    if (!agent.api_v2_capabilities || agent.api_v2_capabilities.length === 0) {
      console.log('⚠️ Aucune capacité API v2. L\'agent ne pourra pas utiliser les outils.');
    }
    
    if (!agent.context_template) {
      console.log('⚠️ Pas de template contextuel. Le contexte ne sera pas personnalisé.');
    }
    
    console.log('✅ Test terminé avec succès');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testChatWithAgent(); 