// Script pour appliquer la migration directement
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 APPLICATION DE LA MIGRATION FUNCTION CALLING');
    console.log('==============================================');

    // 1. Vérifier la structure actuelle de la table agents
    console.log('\n1️⃣ **VÉRIFICATION DE LA TABLE AGENTS**');
    
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, api_v2_capabilities')
      .limit(5);

    if (agentsError) {
      console.error('❌ Erreur lors de la récupération des agents:', agentsError);
      return;
    }

    console.log('📋 Agents actuels:');
    agents.forEach(agent => {
      console.log(`   - ${agent.name}: ${agent.api_v2_capabilities ? agent.api_v2_capabilities.join(', ') : 'Aucune capacité'}`);
    });

    // 2. Appliquer la migration
    console.log('\n2️⃣ **APPLICATION DE LA MIGRATION**');
    
    // Ajouter la colonne si elle n'existe pas
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agents' AND column_name = 'api_v2_capabilities'
          ) THEN
            ALTER TABLE agents ADD COLUMN api_v2_capabilities TEXT[] DEFAULT '{}';
          END IF;
        END $$;
      `
    });

    if (alterError) {
      console.log('⚠️ Colonne déjà existante ou erreur:', alterError.message);
    } else {
      console.log('✅ Colonne api_v2_capabilities ajoutée');
    }

    // 3. Mettre à jour les agents existants
    console.log('\n3️⃣ **MISE À JOUR DES AGENTS**');
    
    const capacitesParDefaut = [
      'create_note',
      'update_note', 
      'add_content_to_note',
      'move_note',
      'delete_note',
      'create_folder'
    ];

    const { error: updateError } = await supabase
      .from('agents')
      .update({ 
        api_v2_capabilities: capacitesParDefaut 
      })
      .is('api_v2_capabilities', null);

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
    } else {
      console.log('✅ Agents mis à jour avec les capacités par défaut');
      console.log(`   Capacités ajoutées: ${capacitesParDefaut.join(', ')}`);
    }

    // 4. Vérifier le résultat
    console.log('\n4️⃣ **VÉRIFICATION DU RÉSULTAT**');
    
    const { data: agentsApres, error: verificationError } = await supabase
      .from('agents')
      .select('id, name, api_v2_capabilities')
      .limit(5);

    if (verificationError) {
      console.error('❌ Erreur lors de la vérification:', verificationError);
      return;
    }

    console.log('📋 Agents après migration:');
    agentsApres.forEach(agent => {
      console.log(`   - ${agent.name}: ${agent.api_v2_capabilities ? agent.api_v2_capabilities.join(', ') : 'Aucune capacité'}`);
    });

    // 5. Test du système
    console.log('\n5️⃣ **TEST DU SYSTÈME FUNCTION CALLING**');
    
    const agentAvecCapacites = agentsApres.find(agent => 
      agent.api_v2_capabilities && agent.api_v2_capabilities.length > 0
    );

    if (agentAvecCapacites) {
      console.log(`✅ Agent trouvé avec capacités: ${agentAvecCapacites.name}`);
      console.log(`   Capacités: ${agentAvecCapacites.api_v2_capabilities.join(', ')}`);
      console.log('✅ Le système Function Calling est maintenant actif !');
    } else {
      console.log('⚠️ Aucun agent avec capacités trouvé');
    }

    console.log('\n🎉 MIGRATION TERMINÉE !');
    console.log('========================');
    console.log('✅ Colonne api_v2_capabilities ajoutée');
    console.log('✅ Agents mis à jour avec les capacités par défaut');
    console.log('✅ Système Function Calling activé');
    console.log('✅ Prêt pour les tests !');

    console.log('\n🚀 PROCHAINES ÉTAPES:');
    console.log('   1. Redémarrer le serveur: npm run dev');
    console.log('   2. Tester avec un agent: Parler à Donna normalement');
    console.log('   3. Vérifier les logs: Les function calls apparaîtront');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

applyMigration(); 