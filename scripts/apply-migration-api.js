#!/usr/bin/env node

/**
 * Script pour appliquer la migration via l'API Supabase
 * Usage: node scripts/apply-migration-api.js
 */

const fs = require('fs');
const path = require('path');

// Lire les variables d'environnement
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('📋 Pour obtenir la SERVICE_ROLE_KEY:');
  console.error('   1. Allez sur votre dashboard Supabase');
  console.error('   2. Settings > API');
  console.error('   3. Copiez la "service_role" key');
  console.error('   4. Ajoutez-la à votre .env.local');
  process.exit(1);
}

// Lire le contenu de la migration
const migrationPath = path.join(__dirname, '../supabase/migrations/20250101_create_chat_sessions.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

async function applyMigration() {
  console.log('🚀 Application de la migration via l\'API Supabase...');
  console.log('==================================================');
  
  try {
    // Exécuter la migration via l'API REST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: migrationContent
      })
    });

    if (response.ok) {
      console.log('✅ Migration appliquée avec succès !');
    } else {
      const error = await response.text();
      console.error('❌ Erreur lors de l\'application de la migration:');
      console.error(error);
      
      console.log('\n📋 Alternative manuelle:');
      console.log('   1. Allez sur votre dashboard Supabase');
      console.log('   2. SQL Editor');
      console.log('   3. Copiez-collez le contenu de la migration');
      console.log('   4. Exécutez la requête');
    }
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    
    console.log('\n📋 Application manuelle de la migration:');
    console.log('==========================================');
    console.log(migrationContent);
  }
}

// Exécuter la migration
applyMigration().catch(console.error); 