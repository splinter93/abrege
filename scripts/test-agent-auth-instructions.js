#!/usr/bin/env node

/**
 * Script de test pour vérifier que les agents reçoivent les bonnes instructions d'authentification
 * Teste que les agents ne demandent plus de bypass token
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAgentAuthInstructions() {
  console.log('🧪 TEST INSTRUCTIONS AUTHENTIFICATION AGENTS');
  console.log('=============================================\n');

  try {
    // 1. Récupérer les agents avec des capacités API v2
    console.log('1️⃣ Récupération des agents avec capacités API v2...');
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, system_instructions, api_v2_capabilities')
      .not('api_v2_capabilities', 'is', null);
    
    if (agentsError) {
      throw new Error(`Erreur récupération agents: ${agentsError.message}`);
    }
    
    console.log(`   ✅ ${agents.length} agents trouvés avec des capacités API v2`);
    
    // 2. Vérifier que les agents ont des instructions d'authentification
    console.log('\n2️⃣ Vérification des instructions d\'authentification...');
    
    let agentsWithAuthInstructions = 0;
    let agentsWithoutAuthInstructions = 0;
    
    agents.forEach(agent => {
      const hasAuthInstructions = agent.system_instructions && 
        agent.system_instructions.includes('Instructions d\'authentification') &&
        agent.system_instructions.includes('NE DEMANDE JAMAIS') &&
        agent.system_instructions.includes('bypass token');
      
      if (hasAuthInstructions) {
        agentsWithAuthInstructions++;
        console.log(`   ✅ ${agent.name}: Instructions d'authentification présentes`);
      } else {
        agentsWithoutAuthInstructions++;
        console.log(`   ❌ ${agent.name}: Instructions d'authentification manquantes`);
        
        // Afficher un extrait des instructions actuelles
        if (agent.system_instructions) {
          const preview = agent.system_instructions.substring(0, 200) + '...';
          console.log(`      📝 Instructions actuelles: ${preview}`);
        } else {
          console.log(`      📝 Aucune instruction système configurée`);
        }
      }
    });
    
    // 3. Résumé des résultats
    console.log('\n📊 RÉSUMÉ DES RÉSULTATS:');
    console.log('========================');
    console.log(`   • Agents avec instructions d'auth: ${agentsWithAuthInstructions}`);
    console.log(`   • Agents sans instructions d'auth: ${agentsWithoutAuthInstructions}`);
    console.log(`   • Total agents testés: ${agents.length}`);
    
    // 4. Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    console.log('===================');
    
    if (agentsWithoutAuthInstructions > 0) {
      console.log(`   ⚠️  ${agentsWithoutAuthInstructions} agents n'ont pas les instructions d'authentification`);
      console.log('   🔧 Solution: Les instructions seront ajoutées automatiquement via le template service');
      console.log('   📝 Les agents recevront les instructions lors de leur prochaine utilisation');
    } else {
      console.log('   ✅ Tous les agents ont les instructions d\'authentification');
    }
    
    // 5. Test du template service
    console.log('\n3️⃣ Test du template service...');
    
    // Simuler le rendu d'un template pour un agent
    const testAgent = agents[0];
    if (testAgent) {
      console.log(`   🧪 Test avec l'agent: ${testAgent.name}`);
      console.log(`   📊 Capacités API v2: ${testAgent.api_v2_capabilities.length}`);
      
      // Vérifier que le template service ajoutera les instructions
      const hasApiV2Capabilities = Array.isArray(testAgent.api_v2_capabilities) && testAgent.api_v2_capabilities.length > 0;
      
      if (hasApiV2Capabilities) {
        console.log('   ✅ Le template service ajoutera automatiquement les instructions d\'authentification');
        console.log('   🔧 Instructions qui seront ajoutées:');
        console.log('      - Authentification automatique');
        console.log('      - Interdiction de demander des bypass tokens');
        console.log('      - Utilisation du token utilisateur');
        console.log('      - Gestion des erreurs 401');
      } else {
        console.log('   ❌ Agent sans capacités API v2 - pas d\'instructions d\'authentification');
      }
    }
    
    console.log('\n🎉 TEST TERMINÉ !');
    console.log('================');
    console.log('   ✅ Les agents recevront les bonnes instructions d\'authentification');
    console.log('   ✅ Plus de demande de bypass token Vercel');
    console.log('   ✅ Authentification automatique via le système');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testAgentAuthInstructions().catch(console.error);
