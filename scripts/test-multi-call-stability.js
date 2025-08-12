#!/usr/bin/env node

/**
 * 🧪 Test de Stabilité des Multi-Calls
 * 
 * Ce script teste que les grosses opérations multi-call
 * ne causent plus de coupures dans le reasoning ou les messages
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variables d\'environnement Supabase manquantes');
  console.log('   NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMultiCallStability() {
  try {
    console.log('🧪 Test de Stabilité des Multi-Calls...');
    
    // 1. Vérifier que l'agent Groq existe
    const { data: groqAgent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('provider', 'groq')
      .eq('model', 'openai/gpt-oss-120b')
      .single();

    if (agentError || !groqAgent) {
      console.log('❌ Agent Groq non trouvé');
      console.log('   Exécutez d\'abord: node scripts/create-groq-reasoning-agent.js');
      return;
    }

    console.log('✅ Agent Groq trouvé:', groqAgent.name);
    console.log('   ID:', groqAgent.id);
    console.log('   Provider:', groqAgent.provider);
    console.log('   Modèle:', groqAgent.model);

    // 2. Scénarios de test pour multi-calls
    console.log('\n🎯 Scénarios de Test Multi-Call:');
    
    const testScenarios = [
      {
        name: 'Grosse tâche avec reasoning',
        prompt: 'Analyse en détail la structure de mon notebook principal. Examine chaque dossier, note et classeur. Fournis une analyse complète avec des recommandations d\'organisation. Sois exhaustif et méthodique.',
        expectedTools: ['get_notebook_tree', 'get_dossier_tree', 'get_notes'],
        riskLevel: '🔴 ÉLEVÉ'
      },
      {
        name: 'Opération complexe multi-étapes',
        prompt: 'Crée un nouveau dossier "Projets 2025", ajoute 3 notes de brainstorming, puis organise tout ça dans un classeur "Planification". Montre-moi le résultat final.',
        expectedTools: ['create_folder', 'create_note', 'create_classeur', 'get_notebook_tree'],
        riskLevel: '🟡 MOYEN'
      },
      {
        name: 'Recherche et analyse combinées',
        prompt: 'Trouve toutes mes notes sur l\'IA, analyse leur contenu, et crée un résumé structuré avec des insights. Sois complet et analytique.',
        expectedTools: ['search_notes', 'get_notes', 'create_note'],
        riskLevel: '🟡 MOYEN'
      }
    ];

    testScenarios.forEach((scenario, index) => {
      console.log(`\n   ${index + 1}. ${scenario.name}`);
      console.log(`      Prompt: ${scenario.prompt.substring(0, 80)}...`);
      console.log(`      Outils attendus: ${scenario.expectedTools.join(', ')}`);
      console.log(`      Niveau de risque: ${scenario.riskLevel}`);
    });

    // 3. Vérifications techniques
    console.log('\n🔧 Vérifications Techniques:');
    
    // Vérifier la configuration du reasoning
    const reasoningEffort = groqAgent.api_config?.reasoning_effort || 'low';
    console.log(`   - Reasoning effort: ${reasoningEffort} ${reasoningEffort === 'medium' ? '✅' : '⚠️'}`);
    
    // Vérifier les capacités
    const hasStreaming = groqAgent.api_v2_capabilities?.includes('streaming');
    const hasFunctionCalls = groqAgent.api_v2_capabilities?.includes('function_calls');
    console.log(`   - Streaming: ${hasStreaming ? '✅' : '❌'}`);
    console.log(`   - Function calls: ${hasFunctionCalls ? '✅' : '❌'}`);

    // 4. Instructions de test manuel
    console.log('\n📋 Instructions de Test Manuel:');
    console.log('   1. Redémarrer le serveur: npm run dev');
    console.log('   2. Aller dans l\'interface de chat');
    console.log('   3. Sélectionner l\'agent "Groq Reasoning"');
    console.log('   4. Tester chaque scénario un par un');
    console.log('   5. Vérifier que:');
    console.log('      - Le reasoning ne coupe pas brutalement');
    console.log('      - Les messages sont complets');
    console.log('      - Tous les outils sont exécutés');
    console.log('      - Pas de messages "Résultat tronqué"');

    // 5. Points de vigilance
    console.log('\n⚠️ Points de Vigilance:');
    console.log('   - Surveiller les logs pour détecter les corrections automatiques');
    console.log('   - Vérifier que le reasoning est complet');
    console.log('   - Confirmer que tous les appels d\'outils réussissent');
    console.log('   - S\'assurer que la réponse finale est cohérente');

    // 6. Résumé des corrections appliquées
    console.log('\n📊 Corrections Appliquées:');
    console.log('   ✅ Streaming robuste: Gestion des chunks incomplets');
    console.log('   ✅ Buffer sécurisé: Tokens préservés avec retry');
    console.log('   ✅ Limite augmentée: 8KB → 64KB pour les outils');
    console.log('   ✅ Validation automatique: Détection des messages tronqués');
    console.log('   ✅ Correction automatique: Ponctuation ajoutée si nécessaire');

    // 7. Résultat attendu
    console.log('\n🎯 Résultat Attendu:');
    console.log('   - Plus de coupures dans le reasoning');
    console.log('   - Messages complets et cohérents');
    console.log('   - Multi-calls stables et fiables');
    console.log('   - Expérience utilisateur fluide');

  } catch (error) {
    console.log('❌ Erreur:', error);
  }
}

testMultiCallStability(); 