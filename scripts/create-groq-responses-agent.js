#!/usr/bin/env node

/**
 * Création d'un agent GroqResponses dans la base de données
 * Usage: node scripts/create-groq-responses-agent.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Charger les variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variables d\'environnement Supabase manquantes');
  console.log('   NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Agent GroqResponses avec Browser Search et Code Execution
const groqResponsesAgent = {
  name: 'Groq Responses Expert',
  provider: 'groq-responses', // ✅ Nouveau provider
  model: 'openai/gpt-oss-20b',
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 8000,
  system_instructions: 'Tu es un assistant IA expert avec accès au web et capable d\'exécuter du code Python. Tu peux rechercher des informations en temps réel et effectuer des calculs complexes.',
  personality: 'Assistant IA expert avec capacités avancées de recherche web et d\'exécution de code',
  expertise: ['recherche web', 'calculs', 'analyse de données', 'informations temps réel'],
  capabilities: ['browser_search', 'code_execution', 'function_calls'],
  api_v2_capabilities: ['browser_search', 'code_execution', 'function_calls'],
  api_config: {
    baseUrl: 'https://api.groq.com/openai/v1',
    endpoint: '/responses',
    enableBrowserSearch: true,
    enableCodeExecution: true,
    enableStructuredOutput: true,
    enableImages: true
  },
  is_active: true,
  priority: 5, // Priorité élevée pour les tests
  is_default: false, // Pas l'agent par défaut pour l'instant
  version: '2.0.0',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

async function createGroqResponsesAgent() {
  try {
    console.log('🚀 Création de l\'agent GroqResponses...\n');
    
    // Vérifier si l'agent existe déjà
    const { data: existingAgent, error: checkError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('provider', 'groq-responses')
      .eq('name', groqResponsesAgent.name)
      .single();

    if (existingAgent) {
      console.log(`⚠️ Agent "${groqResponsesAgent.name}" existe déjà (ID: ${existingAgent.id})`);
      console.log('   Mise à jour de l\'agent existant...');
      
      const { data: updatedAgent, error: updateError } = await supabase
        .from('agents')
        .update({
          ...groqResponsesAgent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erreur mise à jour agent:', updateError.message);
        return;
      }

      console.log('✅ Agent mis à jour avec succès !');
      console.log(`   ID: ${updatedAgent.id}`);
      console.log(`   Nom: ${updatedAgent.name}`);
      console.log(`   Provider: ${updatedAgent.provider}`);
      console.log(`   Modèle: ${updatedAgent.model}`);
      console.log(`   Browser Search: ${updatedAgent.api_config.enableBrowserSearch ? '✅' : '❌'}`);
      console.log(`   Code Execution: ${updatedAgent.api_config.enableCodeExecution ? '✅' : '❌'}`);
      
    } else {
      // Créer un nouvel agent
      const { data: newAgent, error: insertError } = await supabase
        .from('agents')
        .insert(groqResponsesAgent)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erreur création agent:', insertError.message);
        return;
      }

      console.log('✅ Agent GroqResponses créé avec succès !');
      console.log(`   ID: ${newAgent.id}`);
      console.log(`   Nom: ${newAgent.name}`);
      console.log(`   Provider: ${newAgent.provider}`);
      console.log(`   Modèle: ${newAgent.model}`);
      console.log(`   Browser Search: ${newAgent.api_config.enableBrowserSearch ? '✅' : '❌'}`);
      console.log(`   Code Execution: ${newAgent.api_config.enableCodeExecution ? '✅' : '❌'}`);
    }

    // Afficher la liste des agents Groq
    console.log('\n📋 Agents Groq disponibles:');
    const { data: groqAgents, error: listError } = await supabase
      .from('agents')
      .select('id, name, provider, model, is_active, priority')
      .or('provider.eq.groq,provider.eq.groq-responses')
      .order('priority', { ascending: false });

    if (!listError && groqAgents) {
      groqAgents.forEach(agent => {
        const status = agent.is_active ? '✅' : '❌';
        console.log(`   ${status} ${agent.name} (${agent.provider} - ${agent.model}) - Priorité: ${agent.priority}`);
      });
    }

    console.log('\n🎯 Prochaines étapes:');
    console.log('   1. Tester l\'agent via l\'interface');
    console.log('   2. Comparer avec l\'agent Groq classique');
    console.log('   3. Activer Browser Search et Code Execution');
    console.log('   4. Définir comme agent par défaut si satisfait');

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
  }
}

// Exécuter le script
createGroqResponsesAgent(); 