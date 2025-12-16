#!/usr/bin/env node
/**
 * Script pour appliquer la migration 20250217_fix_slow_session_delete.sql
 * via l'API Supabase Management
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables manquantes: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  console.log('🔧 Application de la migration fix_slow_session_delete...\n');

  const sql = readFileSync('supabase/migrations/20250217_fix_slow_session_delete.sql', 'utf-8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }

    console.log('✅ Migration appliquée avec succès !');
    console.log('⚡ Les suppressions de sessions devraient maintenant être instantanées.');
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

applyMigration();

