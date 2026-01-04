/**
 * Script pour appliquer la migration des callables Synesia
 * Usage: node scripts/apply-synesia-callables-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables manquantes: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  console.log('🔧 Application de la migration synesia_callables...\n');

  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250128_create_synesia_callables.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  try {
    // Exécuter la migration SQL directement
    // Note: Supabase JS client ne supporte pas l'exécution directe de SQL multiple
    // Il faut utiliser Supabase Dashboard ou CLI, ou diviser en requêtes individuelles
    
    console.log('⚠️  Le client Supabase JS ne peut pas exécuter directement du SQL complexe.');
    console.log('📋 Options pour appliquer la migration:\n');
    
    console.log('1️⃣  Via Supabase Dashboard (recommandé):');
    console.log('   - Allez sur https://supabase.com/dashboard');
    console.log('   - Sélectionnez votre projet');
    console.log('   - Database > SQL Editor');
    console.log(`   - Copiez-collez le contenu de: ${migrationPath}`);
    console.log('   - Exécutez la migration\n');
    
    console.log('2️⃣  Via Supabase CLI:');
    console.log('   - supabase db push\n');
    
    console.log('📄 Contenu de la migration:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(sql.substring(0, 500) + '...');
    console.log('─────────────────────────────────────────────────────────────\n');
    
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

applyMigration();





