#!/usr/bin/env node

/**
 * Test de l'API LLM Direct de Synesia avec le schéma OpenAPI Scrivia
 * Usage: node test-synesia-llm-direct.js
 */

const fs = require('fs');

// Configuration
const SYNESIA_API_KEY = process.env.SYNESIA_API_KEY;
const SYNESIA_PROJECT_ID = process.env.SYNESIA_PROJECT_ID;
const SYNESIA_MODEL_ID = process.env.SYNESIA_MODEL_ID || 'gpt-4'; // ou un autre modèle

// Charger le schéma OpenAPI
const openApiSchema = JSON.parse(fs.readFileSync('./scrivia-openapi-schema.json', 'utf8'));

/**
 * Test 1: Créer une note avec l'API LLM Direct
 */
async function testCreateNote() {
  console.log('🧪 Test 1: Créer une note avec l\'API LLM Direct');
  
  const payload = {
    messages: [
      {
        role: 'user',
        content: 'Crée une note intitulée "Guide de l\'API LLM Direct" dans le classeur "tests" avec le contenu markdown suivant: # Guide API LLM Direct\n\nCe guide explique comment utiliser l\'API LLM Direct de Synesia avec notre schéma OpenAPI.'
      }
    ],
    model_id: SYNESIA_MODEL_ID,
    llmConfig: {
      temperature: 0.3,
      max_completion_tokens: 2000,
      reasoning_effort: 'medium'
    },
    config: {
      max_loops: 5
    },
    tools: [
      {
        type: 'openapi',
        schema: openApiSchema,
        flatten: true,
        description: 'ScriviaAPI'
      }
    ]
  };

  try {
    const response = await fetch('https://api.synesia.app/llm-exec/round', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${SYNESIA_API_KEY}`,
        'X-Project-ID': SYNESIA_PROJECT_ID,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Synesia API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Réponse reçue:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

/**
 * Test 2: Lister les classeurs et créer une structure
 */
async function testListAndCreateStructure() {
  console.log('\n🧪 Test 2: Lister les classeurs et créer une structure');
  
  const payload = {
    messages: [
      {
        role: 'user',
        content: 'Liste tous mes classeurs, puis crée un nouveau classeur appelé "Projets API" avec l\'emoji 🚀 et la couleur #3B82F6. Ensuite, crée un dossier "Documentation" dans ce classeur.'
      }
    ],
    model_id: SYNESIA_MODEL_ID,
    llmConfig: {
      temperature: 0.2,
      max_completion_tokens: 3000,
      reasoning_effort: 'high'
    },
    config: {
      max_loops: 8
    },
    tools: [
      {
        type: 'openapi',
        schema: openApiSchema,
        flatten: true,
        description: 'ScriviaAPI'
      }
    ]
  };

  try {
    const response = await fetch('https://api.synesia.app/llm-exec/round', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${SYNESIA_API_KEY}`,
        'X-Project-ID': SYNESIA_PROJECT_ID,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Synesia API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Réponse reçue:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

/**
 * Test 3: Gestion d'erreurs et validation
 */
async function testErrorHandling() {
  console.log('\n🧪 Test 3: Test de gestion d\'erreurs');
  
  const payload = {
    messages: [
      {
        role: 'user',
        content: 'Crée une note sans titre (ce qui devrait échouer) et ensuite crée une note valide appelée "Note de test" dans le premier classeur disponible.'
      }
    ],
    model_id: SYNESIA_MODEL_ID,
    llmConfig: {
      temperature: 0.1,
      max_completion_tokens: 2000,
      reasoning_effort: 'high'
    },
    config: {
      max_loops: 5
    },
    tools: [
      {
        type: 'openapi',
        schema: openApiSchema,
        flatten: true,
        description: 'ScriviaAPI'
      }
    ]
  };

  try {
    const response = await fetch('https://api.synesia.app/llm-exec/round', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${SYNESIA_API_KEY}`,
        'X-Project-ID': SYNESIA_PROJECT_ID,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Synesia API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Réponse reçue:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

/**
 * Test 4: Opérations complexes avec reasoning
 */
async function testComplexOperations() {
  console.log('\n🧪 Test 4: Opérations complexes avec reasoning');
  
  const payload = {
    messages: [
      {
        role: 'user',
        content: 'Analyse mes classeurs existants. Si tu trouves un classeur "tests", crée une note "Résultats API LLM Direct" dedans avec un résumé de nos tests. Si ce classeur n\'existe pas, crée-le d\'abord. Ensuite, ajoute du contenu à cette note avec les statistiques de nos tests.'
      }
    ],
    model_id: SYNESIA_MODEL_ID,
    llmConfig: {
      temperature: 0.3,
      max_completion_tokens: 4000,
      reasoning_effort: 'high',
      reasoning_summary: 'detailed'
    },
    config: {
      max_loops: 10
    },
    tools: [
      {
        type: 'openapi',
        schema: openApiSchema,
        flatten: true,
        description: 'ScriviaAPI'
      }
    ]
  };

  try {
    const response = await fetch('https://api.synesia.app/llm-exec/round', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${SYNESIA_API_KEY}`,
        'X-Project-ID': SYNESIA_PROJECT_ID,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Synesia API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Réponse reçue:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

/**
 * Test 5: Comparaison avec le système actuel
 */
async function testComparison() {
  console.log('\n🧪 Test 5: Comparaison avec le système actuel');
  
  const payload = {
    messages: [
      {
        role: 'user',
        content: 'Compare l\'efficacité de l\'API LLM Direct avec notre système de function calling actuel. Crée une note "Comparaison API" avec tes observations sur les avantages et inconvénients de chaque approche.'
      }
    ],
    model_id: SYNESIA_MODEL_ID,
    llmConfig: {
      temperature: 0.4,
      max_completion_tokens: 3000,
      reasoning_effort: 'high',
      reasoning_summary: 'detailed'
    },
    config: {
      max_loops: 6
    },
    tools: [
      {
        type: 'openapi',
        schema: openApiSchema,
        flatten: true,
        description: 'ScriviaAPI'
      }
    ]
  };

  try {
    const response = await fetch('https://api.synesia.app/llm-exec/round', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${SYNESIA_API_KEY}`,
        'X-Project-ID': SYNESIA_PROJECT_ID,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Synesia API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Réponse reçue:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return null;
  }
}

/**
 * Fonction principale
 */
async function runTests() {
  console.log('🚀 Démarrage des tests de l\'API LLM Direct de Synesia');
  console.log('📊 Schéma OpenAPI chargé:', Object.keys(openApiSchema.paths).length, 'endpoints');
  console.log('🔑 Configuration:', {
    hasApiKey: !!SYNESIA_API_KEY,
    hasProjectId: !!SYNESIA_PROJECT_ID,
    modelId: SYNESIA_MODEL_ID
  });

  if (!SYNESIA_API_KEY || !SYNESIA_PROJECT_ID) {
    console.error('❌ Variables d\'environnement manquantes:');
    console.error('   - SYNESIA_API_KEY');
    console.error('   - SYNESIA_PROJECT_ID');
    console.error('   - SYNESIA_MODEL_ID (optionnel)');
    process.exit(1);
  }

  const results = [];

  // Exécuter les tests
  results.push(await testCreateNote());
  results.push(await testListAndCreateStructure());
  results.push(await testErrorHandling());
  results.push(await testComplexOperations());
  results.push(await testComparison());

  // Résumé
  console.log('\n📊 RÉSUMÉ DES TESTS');
  console.log('====================');
  
  const successfulTests = results.filter(r => r !== null).length;
  const totalTests = results.length;
  
  console.log(`✅ Tests réussis: ${successfulTests}/${totalTests}`);
  
  if (successfulTests === totalTests) {
    console.log('🎉 Tous les tests ont réussi !');
    console.log('💡 L\'API LLM Direct de Synesia fonctionne parfaitement avec notre schéma OpenAPI');
  } else {
    console.log('⚠️ Certains tests ont échoué');
    console.log('🔍 Vérifiez les logs ci-dessus pour plus de détails');
  }

  console.log('\n📋 Recommandations:');
  console.log('1. Analyser les réponses pour évaluer la qualité des interactions');
  console.log('2. Comparer avec votre système de function calling actuel');
  console.log('3. Tester avec différents modèles et configurations');
  console.log('4. Évaluer les performances et la fiabilité');
}

// Exécuter les tests
runTests().catch(console.error); 