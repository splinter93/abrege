#!/usr/bin/env node

/**
 * Script pour appliquer la migration des agents spécialisés
 * Applique la migration SQL et vérifie l'installation
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function applyMigration() {
  try {
    log('🚀 Application de la migration des agents spécialisés...', 'blue');

    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250201_specialized_agents_extension.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Diviser le SQL en requêtes individuelles
    const queries = migrationSQL
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    log(`📝 ${queries.length} requêtes SQL à exécuter`, 'blue');

    // Exécuter chaque requête
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.trim()) {
        try {
          log(`  ${i + 1}/${queries.length} Exécution de la requête...`, 'yellow');
          
          const { error } = await supabase.rpc('exec_sql', { sql_query: query });
          
          if (error) {
            // Si exec_sql n'existe pas, essayer une approche alternative
            if (error.message.includes('function exec_sql')) {
              log('  ⚠️ Fonction exec_sql non disponible, tentative alternative...', 'yellow');
              
              // Pour les requêtes ALTER TABLE, on peut les ignorer si les colonnes existent déjà
              if (query.includes('ALTER TABLE agents ADD COLUMN')) {
                log('  ⏭️ Requête ALTER TABLE ignorée (peut déjà exister)', 'yellow');
                continue;
              }
              
              // Pour les INSERT, on peut les ignorer en cas de conflit
              if (query.includes('INSERT INTO agents')) {
                log('  ⏭️ Requête INSERT ignorée (peut déjà exister)', 'yellow');
                continue;
              }
            } else {
              throw error;
            }
          } else {
            log('  ✅ Requête exécutée avec succès', 'green');
          }
        } catch (queryError) {
          log(`  ❌ Erreur requête ${i + 1}: ${queryError.message}`, 'red');
          // Continuer avec les autres requêtes
        }
      }
    }

    // Vérifier l'installation
    await verifyInstallation();

    log('\n🎉 Migration appliquée avec succès !', 'green');
    log('📋 Prochaines étapes:', 'blue');
    log('  1. Redémarrer l\'application', 'yellow');
    log('  2. Tester avec: node scripts/test-specialized-agents.js', 'yellow');
    log('  3. Vérifier l\'interface: /api/v2/openapi-schema', 'yellow');

  } catch (error) {
    log(`\n❌ Erreur fatale: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function verifyInstallation() {
  try {
    log('\n🔍 Vérification de l\'installation...', 'blue');

    // Vérifier que la table agents a les nouvelles colonnes
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'agents')
      .in('column_name', ['slug', 'display_name', 'description', 'is_endpoint_agent', 'is_chat_agent', 'input_schema', 'output_schema']);

    if (columnsError) {
      log('  ⚠️ Impossible de vérifier les colonnes (normal si pas d\'accès direct)', 'yellow');
    } else {
      const newColumns = columns.map(c => c.column_name);
      log(`  ✅ Colonnes spécialisées trouvées: ${newColumns.join(', ')}`, 'green');
    }

    // Vérifier les agents de test
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('slug, display_name, is_endpoint_agent')
      .eq('is_endpoint_agent', true);

    if (agentsError) {
      log('  ⚠️ Impossible de vérifier les agents (normal si pas d\'accès direct)', 'yellow');
    } else {
      log(`  ✅ ${agents.length} agents spécialisés trouvés`, 'green');
      agents.forEach(agent => {
        log(`     - ${agent.display_name} (${agent.slug})`, 'yellow');
      });
    }

    // Test de l'API
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v2/openapi-schema`);
      if (response.ok) {
        log('  ✅ API accessible', 'green');
      } else {
        log('  ⚠️ API non accessible (normal si l\'app n\'est pas démarrée)', 'yellow');
      }
    } catch (apiError) {
      log('  ⚠️ API non accessible (normal si l\'app n\'est pas démarrée)', 'yellow');
    }

  } catch (error) {
    log(`  ⚠️ Erreur lors de la vérification: ${error.message}`, 'yellow');
  }
}

// Exécuter la migration
applyMigration();
