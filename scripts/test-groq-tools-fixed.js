#!/usr/bin/env node

/**
 * 🔧 Test des Tools pour Groq GPT-OSS (Version Corrigée)
 * 
 * Ce script vérifie que les tools sont correctement configurés pour Groq
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Test des Tools pour Groq GPT-OSS...\n');

// 1. Vérifier le fichier route.ts
const routePath = path.join(__dirname, '../src/app/api/chat/llm/route.ts');
if (fs.existsSync(routePath)) {
  const routeContent = fs.readFileSync(routePath, 'utf8');
  
  console.log('📋 Vérifications du Code:');
  
  const checks = [
    {
      name: 'Tools inclus dans payload Groq',
      condition: routeContent.includes('...(tools && { tools, tool_choice: \'auto\' })') && routeContent.includes('useGroq'),
      description: 'Tools inclus dans le payload pour Groq'
    },
    {
      name: 'Format tools correct (OpenAI)',
      condition: routeContent.includes('tool_choice: \'auto\'') && routeContent.includes('tools'),
      description: 'Format OpenAI standard pour les tools'
    },
    {
      name: 'Gestion function calls dans streaming',
      condition: routeContent.includes('delta.function_call') && routeContent.includes('delta.tool_calls'),
      description: 'Gestion des function calls dans le streaming'
    },
    {
      name: 'AgentApiV2Tools importé',
      condition: routeContent.includes('agentApiV2Tools') && routeContent.includes('getToolsForFunctionCalling'),
      description: 'Service AgentApiV2Tools importé et utilisé'
    }
  ];

  checks.forEach(check => {
    console.log(`   - ${check.name}: ${check.condition ? '✅' : '❌'}`);
    if (!check.condition) {
      console.log(`     ${check.description}`);
    }
  });

  // 2. Vérifier le service AgentApiV2Tools
  const toolsPath = path.join(__dirname, '../src/services/agentApiV2Tools.ts');
  if (fs.existsSync(toolsPath)) {
    const toolsContent = fs.readFileSync(toolsPath, 'utf8');
    
    console.log('\n🔧 Service AgentApiV2Tools:');
    
    const toolChecks = [
      {
        name: 'Méthode getToolsForFunctionCalling',
        condition: toolsContent.includes('getToolsForFunctionCalling'),
        description: 'Méthode pour récupérer les tools'
      },
      {
        name: 'Format OpenAI tools',
        condition: toolsContent.includes('type: \'function\'') && toolsContent.includes('function:'),
        description: 'Format OpenAI pour les tools'
      },
      {
        name: 'Tools disponibles',
        condition: toolsContent.includes('create_note') || toolsContent.includes('update_note'),
        description: 'Au moins quelques tools de base'
      }
    ];

    toolChecks.forEach(check => {
      console.log(`   - ${check.name}: ${check.condition ? '✅' : '❌'}`);
      if (!check.condition) {
        console.log(`     ${check.description}`);
      }
    });
  } else {
    console.log('\n❌ Service AgentApiV2Tools non trouvé');
  }

  // 3. Exemple de payload pour Groq
  console.log('\n📤 Exemple de Payload pour Groq:');
  const examplePayload = {
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant IA avec capacité de raisonnement.'
      },
      {
        role: 'user',
        content: 'Crée une note sur la théorie de la relativité'
      }
    ],
    stream: true,
    temperature: 0.7,
    max_completion_tokens: 1000,
    top_p: 0.9,
    reasoning_effort: 'medium',
    tools: [
      {
        type: 'function',
        function: {
          name: 'create_note',
          description: 'Créer une nouvelle note',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Titre de la note'
              },
              content: {
                type: 'string',
                description: 'Contenu de la note'
              }
            },
            required: ['title']
          }
        }
      }
    ],
    tool_choice: 'auto'
  };

  console.log(JSON.stringify(examplePayload, null, 2));

  // 4. Instructions de test
  console.log('\n🧪 Instructions de Test:');
  console.log('1. Redémarrez le serveur: npm run dev');
  console.log('2. Sélectionnez l\'agent Groq GPT-OSS');
  console.log('3. Demandez: "Crée une note sur la théorie de la relativité"');
  console.log('4. Vérifiez dans les logs du terminal:');
  console.log('   - "🔧 Tools disponibles: [nombre]"');
  console.log('   - "📤 Payload complet envoyé à Groq" avec tools inclus');
  console.log('   - "🔧 Tool calls détectés" si une fonction est appelée');

  // 5. Différence entre tools et function_calls
  console.log('\n📚 Différence Tools vs Function Calls:');
  console.log('   - tools: Format OpenAI standard (recommandé)');
  console.log('   - function_calls: Ancien format (déprécié)');
  console.log('   - Groq utilise l\'API OpenAI → Format "tools"');

  // 6. Résumé
  console.log('\n📊 Résumé:');
  const hasToolsInPayload = routeContent.includes('...(tools && { tools, tool_choice: \'auto\' })');
  const hasFunctionCallHandling = routeContent.includes('delta.tool_calls') || routeContent.includes('delta.function_call');

  console.log(`   - Tools dans payload Groq: ${hasToolsInPayload ? '✅' : '❌'}`);
  console.log(`   - Gestion function calls: ${hasFunctionCallHandling ? '✅' : '❌'}`);

  if (hasToolsInPayload && hasFunctionCallHandling) {
    console.log('\n🎉 Configuration correcte ! Groq devrait avoir accès aux tools.');
  } else {
    console.log('\n⚠️ Problèmes détectés dans la configuration des tools.');
  }
} else {
  console.log('❌ Fichier route.ts non trouvé');
} 