#!/usr/bin/env node

/**
 * Script pour appliquer la migration de sécurité Phase 1
 * Usage: node scripts/apply-security-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Client Supabase avec service role
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Lire le fichier de migration
const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20250131_secure_files_phase1.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Diviser le SQL en commandes individuelles
const commands = migrationSQL
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

console.log('🚀 Application de la migration de sécurité Phase 1...');
console.log(`📊 ${commands.length} commandes SQL à exécuter`);

async function applyMigration() {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    
    try {
      console.log(`\n🔧 [${i + 1}/${commands.length}] Exécution...`);
      
      // Exécuter la commande SQL
      const { error } = await supabase.rpc('exec_sql', { sql: command });
      
      if (error) {
        // Si exec_sql n'existe pas, essayer directement
        const { error: directError } = await supabase.from('_dummy').select('*').limit(0);
        if (directError && directError.message.includes('exec_sql')) {
          console.log('⚠️  exec_sql non disponible, tentative d\'exécution directe...');
          // Note: Les commandes DDL ne peuvent pas être exécutées via l'API REST
          console.log('ℹ️  Commande DDL détectée, à appliquer manuellement via Supabase Dashboard');
          console.log(`   SQL: ${command.substring(0, 100)}...`);
        } else {
          throw error;
        }
      } else {
        successCount++;
        console.log('✅ Succès');
      }
      
    } catch (err) {
      errorCount++;
      console.error(`❌ Erreur: ${err.message}`);
      
      // Continuer avec les commandes suivantes
      if (i < commands.length - 1) {
        console.log('⏭️  Passage à la commande suivante...');
      }
    }
  }

  console.log('\n📊 Résumé:');
  console.log(`   ✅ Succès: ${successCount}`);
  console.log(`   ❌ Erreurs: ${errorCount}`);
  console.log(`   📝 Total: ${commands.length}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Certaines commandes ont échoué.');
    console.log('   Les commandes DDL doivent être appliquées manuellement via:');
    console.log('   1. Supabase Dashboard > SQL Editor');
    console.log('   2. Copier le contenu de supabase/migrations/20250131_secure_files_phase1.sql');
    console.log('   3. Exécuter le script SQL');
  } else {
    console.log('\n🎉 Migration appliquée avec succès !');
  }
}

// Fonction pour vérifier l'état de la migration
async function checkMigrationStatus() {
  console.log('\n🔍 Vérification de l\'état de la migration...');
  
  try {
    // Vérifier si les nouvelles tables existent
    const { data: storageUsageExists } = await supabase
      .from('storage_usage')
      .select('user_id')
      .limit(1);
    
    const { data: fileEventsExists } = await supabase
      .from('file_events')
      .select('id')
      .limit(1);
    
    // Vérifier si les nouvelles colonnes existent
    const { data: filesWithStatus } = await supabase
      .from('files')
      .select('status, sha256, request_id, deleted_at, etag')
      .limit(1);
    
    console.log('📋 État des tables:');
    console.log(`   storage_usage: ${storageUsageExists ? '✅' : '❌'}`);
    console.log(`   file_events: ${fileEventsExists ? '✅' : '❌'}`);
    console.log(`   Nouvelles colonnes files: ${filesWithStatus ? '✅' : '❌'}`);
    
  } catch (err) {
    console.error('❌ Erreur lors de la vérification:', err.message);
  }
}

// Exécution
async function main() {
  try {
    await applyMigration();
    await checkMigrationStatus();
  } catch (err) {
    console.error('❌ Erreur fatale:', err.message);
    process.exit(1);
  }
}

main(); 