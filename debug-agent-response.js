#!/usr/bin/env node

/**
 * Script de débogage pour analyser pourquoi l'endpoint d'exécution
 * retourne "Réponse générée" au lieu de la vraie réponse du LLM
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

async function debugAgentResponse() {
  console.log('🔍 Débogage de la réponse des agents...\n');

  // Test avec différents agents et messages
  const testCases = [
    {
      name: 'Test simple',
      ref: 'test-agent', // Remplacez par un agent existant
      input: 'Dis bonjour',
      expected: 'Ne devrait pas être "Réponse générée"'
    },
    {
      name: 'Test complexe',
      ref: 'test-agent',
      input: 'Explique-moi ce qu\'est l\'intelligence artificielle en 2 phrases',
      expected: 'Réponse détaillée attendue'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 ${testCase.name}:`);
    console.log('─'.repeat(40));
    
    try {
      const response = await fetch(`${API_BASE}/api/v2/agents/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // Remplacez par un vrai token
        },
        body: JSON.stringify({
          ref: testCase.ref,
          input: testCase.input,
          options: {
            temperature: 0.7,
            max_tokens: 500
          }
        })
      });

      const result = await response.json();
      
      console.log('Status:', response.status);
      console.log('Success:', result.success);
      
      if (result.success && result.data) {
        console.log('Agent:', result.data.agent_name);
        console.log('Modèle:', result.data.model_used);
        console.log('Temps:', result.data.execution_time + 'ms');
        console.log('Longueur réponse:', result.data.response.length);
        
        // Analyser la réponse
        if (result.data.response === 'Réponse générée') {
          console.log('❌ PROBLÈME: Fallback détecté');
          console.log('🔍 Causes possibles:');
          console.log('  - orchestratorResult.content est vide');
          console.log('  - Problème dans GroqOrchestrator.executeRound()');
          console.log('  - Erreur dans le formatage de la réponse');
        } else {
          console.log('✅ Réponse réelle reçue');
          console.log('📝 Aperçu:', result.data.response.substring(0, 100) + '...');
        }
        
        // Vérifier les métadonnées
        if (result.meta) {
          console.log('📊 Métadonnées:');
          console.log('  - Type agent:', result.meta.agent_type);
          console.log('  - Longueur entrée:', result.meta.input_length);
          console.log('  - Longueur sortie:', result.meta.response_length);
        }
      } else {
        console.log('❌ Erreur:', result.error || result.message);
        if (result.code) {
          console.log('Code erreur:', result.code);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur réseau:', error.message);
    }
  }
}

// Fonction pour tester directement l'orchestrateur
async function testOrchestratorDirectly() {
  console.log('\n🔧 Test direct de l\'orchestrateur...\n');
  
  // Cette fonction nécessiterait d'être intégrée dans le code
  // pour tester directement GroqOrchestrator.executeRound()
  console.log('💡 Pour tester l\'orchestrateur directement:');
  console.log('1. Ajoutez des logs dans GroqOrchestrator.executeRound()');
  console.log('2. Vérifiez que la propriété "content" est bien remplie');
  console.log('3. Vérifiez les erreurs potentielles dans l\'appel à l\'API Groq');
}

// Fonction pour analyser les logs du serveur
function analyzeServerLogs() {
  console.log('\n📋 Analyse des logs du serveur:\n');
  
  console.log('🔍 Recherchez ces patterns dans les logs:');
  console.log('1. "[SpecializedAgentManager] 🔍 Résultat orchestrateur brut:"');
  console.log('   - Vérifiez si "content" est vide');
  console.log('   - Vérifiez si "success" est true');
  console.log('   - Vérifiez les "orchestratorKeys"');
  
  console.log('\n2. "[SpecializedAgentManager] 🔍 Format simple (pas de schéma):"');
  console.log('   - Vérifiez "extractedResponse"');
  console.log('   - Vérifiez "resultObjKeys"');
  
  console.log('\n3. "[SpecializedAgentManager] 🔍 Réponse finale extraite:"');
  console.log('   - Vérifiez "finalResponse"');
  console.log('   - Vérifiez "finalResponseLength"');
  
  console.log('\n4. "[GroqOrchestrator]" logs:');
  console.log('   - Vérifiez les appels à l\'API Groq');
  console.log('   - Vérifiez les réponses reçues');
  console.log('   - Vérifiez les erreurs potentielles');
}

async function main() {
  console.log('🚀 Débogage de la réponse des agents\n');
  
  await debugAgentResponse();
  await testOrchestratorDirectly();
  analyzeServerLogs();
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 Prochaines étapes:');
  console.log('1. Exécutez ce script avec un vrai token JWT');
  console.log('2. Vérifiez les logs du serveur Next.js');
  console.log('3. Si le problème persiste, ajoutez plus de logs dans GroqOrchestrator');
  console.log('4. Vérifiez la configuration de l\'API Groq');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { debugAgentResponse, testOrchestratorDirectly, analyzeServerLogs };
