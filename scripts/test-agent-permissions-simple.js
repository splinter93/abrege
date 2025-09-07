#!/usr/bin/env node

/**
 * Script simple pour tester la solution des permissions des agents
 * Vérifie directement la base de données sans avoir besoin d'un token utilisateur
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

async function testAgentPermissionsSimple() {
  console.log('🧪 TEST SIMPLE DES PERMISSIONS DES AGENTS');
  console.log('==========================================\n');

  try {
    // 1. Vérifier les agents et leurs scopes
    console.log('📋 Vérification des agents et leurs scopes...');
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, api_v2_capabilities, is_active')
      .eq('is_active', true);

    if (agentsError) {
      throw new Error(`Erreur récupération agents: ${agentsError.message}`);
    }

    console.log(`✅ ${agents.length} agents actifs trouvés\n`);

    // 2. Analyser les scopes de chaque agent
    let agentsWithScopes = 0;
    let agentsWithoutScopes = 0;

    agents.forEach(agent => {
      const hasScopes = agent.api_v2_capabilities && agent.api_v2_capabilities.length > 0;
      
      if (hasScopes) {
        agentsWithScopes++;
        console.log(`✅ ${agent.name}: ${agent.api_v2_capabilities.length} scopes`);
        console.log(`   Scopes: ${agent.api_v2_capabilities.slice(0, 3).join(', ')}${agent.api_v2_capabilities.length > 3 ? '...' : ''}`);
      } else {
        agentsWithoutScopes++;
        console.log(`❌ ${agent.name}: Aucun scope configuré`);
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSULTATS:');
    console.log(`✅ Agents avec scopes: ${agentsWithScopes}`);
    console.log(`❌ Agents sans scopes: ${agentsWithoutScopes}`);
    console.log(`📋 Total agents: ${agents.length}`);

    // 3. Vérifier la structure de la table agents
    console.log('\n🔍 Vérification de la structure de la table agents...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('agents')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error(`❌ Erreur vérification table: ${tableError.message}`);
    } else {
      console.log('✅ Table agents accessible');
      
      // Vérifier les colonnes importantes
      const sampleAgent = tableInfo[0];
      if (sampleAgent) {
        console.log('📋 Colonnes disponibles:');
        console.log(`  • api_v2_capabilities: ${sampleAgent.api_v2_capabilities ? '✅' : '❌'}`);
        console.log(`  • system_instructions: ${sampleAgent.system_instructions ? '✅' : '❌'}`);
        console.log(`  • context_template: ${sampleAgent.context_template ? '✅' : '❌'}`);
        console.log(`  • capabilities: ${sampleAgent.capabilities ? '✅' : '❌'}`);
      }
    }

    // 4. Test de la logique de validation des scopes
    console.log('\n🔧 Test de la logique de validation des scopes...');
    
    const testScopes = [
      'notes:read', 'notes:write', 'notes:create', 'notes:update', 'notes:delete',
      'classeurs:read', 'classeurs:write', 'classeurs:create', 'classeurs:update', 'classeurs:delete',
      'dossiers:read', 'dossiers:write', 'dossiers:create', 'dossiers:update', 'dossiers:delete',
      'files:read', 'files:write', 'files:upload', 'files:delete',
      'agents:execute', 'agents:read',
      'search:content', 'profile:read'
    ];

    console.log(`📋 Scopes par défaut: ${testScopes.length} scopes`);
    console.log(`   Exemples: ${testScopes.slice(0, 5).join(', ')}...`);

    // Vérifier si les agents ont les scopes nécessaires
    const requiredScopes = ['notes:create', 'notes:read', 'notes:write'];
    let agentsWithRequiredScopes = 0;

    agents.forEach(agent => {
      if (agent.api_v2_capabilities) {
        const hasRequiredScopes = requiredScopes.every(scope => 
          agent.api_v2_capabilities.includes(scope)
        );
        
        if (hasRequiredScopes) {
          agentsWithRequiredScopes++;
        }
      }
    });

    console.log(`✅ Agents avec scopes requis (${requiredScopes.join(', ')}): ${agentsWithRequiredScopes}/${agents.length}`);

    // 5. Conclusion
    console.log('\n' + '='.repeat(50));
    console.log('🎯 CONCLUSION:');
    
    if (agentsWithScopes === agents.length) {
      console.log('🎉 SUCCÈS: Tous les agents ont des scopes configurés !');
      console.log('✅ La solution des permissions devrait fonctionner');
    } else {
      console.log('⚠️ ATTENTION: Certains agents n\'ont pas de scopes');
      console.log('💡 Exécutez: node scripts/fix-agent-scopes.js');
    }

    if (agentsWithRequiredScopes === agents.length) {
      console.log('✅ Tous les agents ont les scopes requis pour créer des notes');
    } else {
      console.log('❌ Certains agents n\'ont pas les scopes requis');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 Test terminé');
}

// Exécuter le test
testAgentPermissionsSimple().catch(console.error);
