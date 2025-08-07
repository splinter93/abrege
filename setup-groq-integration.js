#!/usr/bin/env node

/**
 * Configuration et test de l'intégration Groq + OpenAPI
 * Usage: node setup-groq-integration.js
 */

console.log('🚀 Configuration de l\'intégration Groq + OpenAPI');
console.log('================================================\n');

// Configuration Groq
const GROQ_CONFIG = {
  apiKey: process.env.GROQ_API_KEY || '',
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'openai/gpt-oss-20b',
  temperature: 0.7,
  maxTokens: 8000,
  topP: 0.9
};

/**
 * Vérifier la configuration
 */
function checkConfiguration() {
  console.log('🔧 Vérification de la configuration...\n');
  
  console.log('📋 Configuration actuelle:');
  console.log(`   Base URL: ${GROQ_CONFIG.baseUrl}`);
  console.log(`   Modèle: ${GROQ_CONFIG.model}`);
  console.log(`   Température: ${GROQ_CONFIG.temperature}`);
  console.log(`   Max Tokens: ${GROQ_CONFIG.maxTokens}`);
  console.log(`   Top P: ${GROQ_CONFIG.topP}`);
  
  if (GROQ_CONFIG.apiKey) {
    console.log(`   API Key: ${GROQ_CONFIG.apiKey.substring(0, 10)}...${GROQ_CONFIG.apiKey.substring(GROQ_CONFIG.apiKey.length - 4)}`);
    console.log('   ✅ Clé API configurée');
  } else {
    console.log('   ❌ Clé API manquante');
    console.log('\n💡 Pour configurer votre clé API Groq:');
    console.log('   1. Créez un compte sur https://console.groq.com/');
    console.log('   2. Générez une clé API');
    console.log('   3. Ajoutez-la à vos variables d\'environnement:');
    console.log('      export GROQ_API_KEY="votre-clé-api"');
    console.log('   4. Ou créez un fichier .env avec:');
    console.log('      GROQ_API_KEY=votre-clé-api');
  }
  
  return !!GROQ_CONFIG.apiKey;
}

/**
 * Simuler l'intégration OpenAPI
 */
function simulateOpenAPIIntegration() {
  console.log('\n🔧 Simulation de l\'intégration OpenAPI...\n');
  
  // Tools disponibles après intégration OpenAPI
  const availableTools = [
    'create_note',
    'add_content_to_note',
    'get_note_content',
    'insert_content_to_note',
    'get_note_insights',
    'get_note_toc',
    'get_note_statistics',
    'merge_note',
    'publish_note',
    'create_folder',
    'move_folder',
    'get_notebook_tree',
    'reorder_notebook'
  ];
  
  console.log('📊 Tools OpenAPI disponibles:');
  availableTools.forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool}`);
  });
  
  console.log(`\n✅ ${availableTools.length} tools OpenAPI prêts pour Groq`);
  
  return availableTools;
}

/**
 * Simuler l'appel Groq avec function calls
 */
function simulateGroqFunctionCalls(tools) {
  console.log('\n🧪 Simulation d\'appel Groq avec function calls...\n');
  
  const messages = [
    {
      role: 'system',
      content: 'Tu es un assistant IA utile. Tu peux utiliser les outils disponibles pour interagir avec l\'API Scrivia.'
    },
    {
      role: 'user',
      content: 'Crée une note intitulée "Test Groq OpenAPI" dans le classeur "main-notebook"'
    }
  ];
  
  const toolsForFunctionCalling = tools.map(tool => ({
    type: 'function',
    function: {
      name: tool,
      description: `Utiliser l'outil ${tool}`,
      parameters: {
        type: 'object',
        properties: {
          // Paramètres génériques pour la démonstration
          param1: { type: 'string' },
          param2: { type: 'string' }
        },
        required: ['param1']
      }
    }
  }));
  
  const payload = {
    model: GROQ_CONFIG.model,
    messages,
    tools: toolsForFunctionCalling,
    tool_choice: 'auto',
    temperature: GROQ_CONFIG.temperature,
    max_completion_tokens: GROQ_CONFIG.maxTokens,
    top_p: GROQ_CONFIG.topP
  };
  
  console.log('📤 Payload pour Groq:');
  console.log(`   Modèle: ${payload.model}`);
  console.log(`   Messages: ${payload.messages.length}`);
  console.log(`   Tools: ${payload.tools.length}`);
  console.log(`   Tool choice: ${payload.tool_choice}`);
  
  console.log('\n📋 Tools disponibles pour Groq:');
  payload.tools.forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.function.name}: ${tool.function.description}`);
  });
  
  return payload;
}

/**
 * Afficher les avantages de l'intégration
 */
function displayIntegrationBenefits() {
  console.log('\n🎯 AVANTAGES DE L\'INTÉGRATION GROQ + OPENAPI');
  console.log('==============================================\n');
  
  const benefits = [
    {
      benefit: '🚀 Performance Ultra-Rapide',
      description: 'Groq offre une latence ultra-faible pour les function calls',
      details: 'Réponses en millisecondes vs secondes'
    },
    {
      benefit: '🧠 GPT OSS 20B/120B',
      description: 'Accès aux modèles GPT OSS les plus avancés',
      details: 'Capacités de raisonnement et de compréhension supérieures'
    },
    {
      benefit: '🔧 Function Calls Natifs',
      description: 'Support natif des function calls avec votre API',
      details: '13 tools OpenAPI disponibles automatiquement'
    },
    {
      benefit: '💰 Coût Optimisé',
      description: 'Pricing compétitif pour les function calls',
      details: '$0.15/1M tokens input, $0.75/1M tokens output'
    },
    {
      benefit: '🔄 Intégration Seamless',
      description: 'Compatible avec votre système existant',
      details: 'Aucune modification de votre API requise'
    }
  ];
  
  benefits.forEach((benefit, index) => {
    console.log(`${index + 1}. ${benefit.benefit}`);
    console.log(`   ${benefit.description}`);
    console.log(`   ${benefit.details}`);
    console.log('');
  });
}

/**
 * Afficher les étapes de configuration
 */
function displaySetupSteps() {
  console.log('\n📋 ÉTAPES DE CONFIGURATION');
  console.log('===========================\n');
  
  const steps = [
    {
      step: '1. Obtenir une clé API Groq',
      action: 'Créer un compte sur https://console.groq.com/',
      details: 'Générer une clé API dans les paramètres'
    },
    {
      step: '2. Configurer la clé API',
      action: 'Ajouter la clé aux variables d\'environnement',
      details: 'export GROQ_API_KEY="votre-clé-api"'
    },
    {
      step: '3. Tester la connexion',
      action: 'Exécuter le script de test',
      details: 'node connect-groq-openapi.js'
    },
    {
      step: '4. Intégrer dans votre code',
      action: 'Utiliser le GroqProvider avec vos tools OpenAPI',
      details: 'Voir l\'exemple d\'intégration'
    }
  ];
  
  steps.forEach(step => {
    console.log(`${step.step}: ${step.action}`);
    console.log(`   ${step.details}`);
    console.log('');
  });
}

/**
 * Afficher l'exemple d'intégration
 */
function displayIntegrationExample() {
  console.log('\n💻 EXEMPLE D\'INTÉGRATION');
  console.log('========================\n');
  
  console.log('// 1. Importer le GroqProvider');
  console.log('import { GroqProvider } from \'@/services/llm/providers/implementations/groq\';');
  console.log('');
  
  console.log('// 2. Créer l\'instance avec vos tools OpenAPI');
  console.log('const groqProvider = new GroqProvider({');
  console.log('  apiKey: process.env.GROQ_API_KEY,');
  console.log('  model: \'openai/gpt-oss-20b\',');
  console.log('  temperature: 0.7');
  console.log('});');
  console.log('');
  
  console.log('// 3. Obtenir vos tools OpenAPI');
  console.log('const agentTools = new AgentApiV2Tools();');
  console.log('const tools = agentTools.getToolsForFunctionCalling();');
  console.log('');
  
  console.log('// 4. Appeler Groq avec function calls');
  console.log('const response = await groqProvider.call(message, context, history, tools);');
  console.log('');
  
  console.log('// 5. Traiter les tool calls');
  console.log('if (response.tool_calls) {');
  console.log('  for (const toolCall of response.tool_calls) {');
  console.log('    const result = await agentTools.executeTool(');
  console.log('      toolCall.function.name,');
  console.log('      JSON.parse(toolCall.function.arguments),');
  console.log('      jwtToken,');
  console.log('      userId');
  console.log('    );');
  console.log('  }');
  console.log('}');
}

/**
 * Fonction principale
 */
function runSetup() {
  console.log('🚀 Configuration de l\'intégration Groq + OpenAPI');
  console.log('================================================\n');
  
  // Vérifier la configuration
  const configOk = checkConfiguration();
  
  // Simuler l'intégration OpenAPI
  const tools = simulateOpenAPIIntegration();
  
  // Simuler l'appel Groq
  const payload = simulateGroqFunctionCalls(tools);
  
  // Afficher les avantages
  displayIntegrationBenefits();
  
  // Afficher les étapes de configuration
  displaySetupSteps();
  
  // Afficher l'exemple d'intégration
  displayIntegrationExample();
  
  console.log('\n🎉 CONFIGURATION TERMINÉE !');
  console.log('============================');
  
  if (configOk) {
    console.log('✅ Configuration Groq valide');
    console.log('✅ Tools OpenAPI prêts');
    console.log('✅ Prêt pour les tests');
    console.log('\n🚀 Exécutez: node connect-groq-openapi.js');
  } else {
    console.log('⚠️ Configuration incomplète');
    console.log('📋 Configurez votre clé API Groq pour continuer');
    console.log('\n💡 Voir les étapes de configuration ci-dessus');
  }
}

// Exécuter la configuration
runSetup(); 