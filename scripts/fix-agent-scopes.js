#!/usr/bin/env node

/**
 * Script pour corriger les scopes des agents spécialisés
 * Met à jour tous les agents avec les scopes OAuth corrects
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

// Scopes OAuth par défaut pour les agents spécialisés
const DEFAULT_AGENT_SCOPES = [
  'notes:read', 'notes:write', 'notes:create', 'notes:update', 'notes:delete',
  'classeurs:read', 'classeurs:write', 'classeurs:create', 'classeurs:update', 'classeurs:delete',
  'dossiers:read', 'dossiers:write', 'dossiers:create', 'dossiers:update', 'dossiers:delete',
  'files:read', 'files:write', 'files:upload', 'files:delete',
  'agents:execute', 'agents:read',
  'search:content', 'profile:read'
];

async function fixAgentScopes() {
  console.log('🔧 CORRECTION DES SCOPES DES AGENTS SPÉCIALISÉS');
  console.log('================================================\n');

  try {
    // 1. Récupérer tous les agents actifs
    console.log('📋 Récupération des agents actifs...');
    const { data: agents, error: fetchError } = await supabase
      .from('agents')
      .select('id, name, api_v2_capabilities')
      .eq('is_active', true);

    if (fetchError) {
      throw new Error(`Erreur récupération agents: ${fetchError.message}`);
    }

    console.log(`✅ ${agents.length} agents actifs trouvés\n`);

    // 2. Identifier les agents avec de mauvais scopes (pas les scopes OAuth)
    const agentsWithWrongScopes = agents.filter(agent => {
      if (!agent.api_v2_capabilities || agent.api_v2_capabilities.length === 0) {
        return true; // Pas de scopes
      }
      
      // Vérifier si ce sont des scopes OAuth (format "resource:action")
      const hasOAuthScopes = agent.api_v2_capabilities.some(scope => 
        scope.includes(':') && (scope.startsWith('notes:') || scope.startsWith('classeurs:') || scope.startsWith('dossiers:'))
      );
      
      return !hasOAuthScopes; // Pas de scopes OAuth
    });

    console.log(`🔍 Agents avec mauvais scopes: ${agentsWithWrongScopes.length}`);
    agentsWithWrongScopes.forEach(agent => {
      const currentScopes = agent.api_v2_capabilities || [];
      console.log(`  • ${agent.name} (ID: ${agent.id})`);
      console.log(`    Scopes actuels: ${currentScopes.join(', ')}`);
    });

    if (agentsWithWrongScopes.length === 0) {
      console.log('\n✅ Tous les agents ont déjà les bons scopes OAuth !');
      return;
    }

    console.log('\n🔧 Mise à jour des agents avec les scopes OAuth corrects...');

    // 3. Mettre à jour les agents avec les bons scopes
    let updatedCount = 0;
    let errorCount = 0;

    for (const agent of agentsWithWrongScopes) {
      try {
        const { error: updateError } = await supabase
          .from('agents')
          .update({ 
            api_v2_capabilities: DEFAULT_AGENT_SCOPES 
          })
          .eq('id', agent.id);

        if (updateError) {
          console.error(`❌ Erreur mise à jour ${agent.name}: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`✅ ${agent.name} mis à jour avec ${DEFAULT_AGENT_SCOPES.length} scopes OAuth`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Erreur mise à jour ${agent.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSULTATS:');
    console.log(`✅ Agents mis à jour: ${updatedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📋 Total agents traités: ${agentsWithWrongScopes.length}`);

    // 4. Vérification finale
    console.log('\n🔍 Vérification finale...');
    const { data: updatedAgents, error: verifyError } = await supabase
      .from('agents')
      .select('id, name, api_v2_capabilities')
      .eq('is_active', true);

    if (verifyError) {
      console.error(`❌ Erreur vérification: ${verifyError.message}`);
    } else {
      const agentsWithOAuthScopes = updatedAgents.filter(agent => {
        if (!agent.api_v2_capabilities || agent.api_v2_capabilities.length === 0) {
          return false;
        }
        
        // Vérifier si ce sont des scopes OAuth
        return agent.api_v2_capabilities.some(scope => 
          scope.includes(':') && (scope.startsWith('notes:') || scope.startsWith('classeurs:') || scope.startsWith('dossiers:'))
        );
      });
      
      console.log(`✅ Agents avec scopes OAuth: ${agentsWithOAuthScopes.length}/${updatedAgents.length}`);
      
      if (agentsWithOAuthScopes.length === updatedAgents.length) {
        console.log('🎉 TOUS LES AGENTS ONT MAINTENANT LES BONS SCOPES OAuth !');
      } else {
        console.log('⚠️ Certains agents n\'ont toujours pas les bons scopes');
      }

      // Afficher un exemple de scopes
      if (agentsWithOAuthScopes.length > 0) {
        const exampleAgent = agentsWithOAuthScopes[0];
        console.log(`\n📋 Exemple de scopes (${exampleAgent.name}):`);
        console.log(`   ${exampleAgent.api_v2_capabilities.slice(0, 5).join(', ')}...`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 Script terminé');
}

// Exécuter le script
fixAgentScopes().catch(console.error);
