#!/usr/bin/env node

/**
 * Script pour appliquer la migration chat_sessions
 * Usage: node scripts/apply-migration.js
 */

const fs = require('fs');
const path = require('path');

// Lire le contenu de la migration
const migrationPath = path.join(__dirname, '../supabase/migrations/20250101_create_chat_sessions.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

console.log('📄 Contenu de la migration:');
console.log('==========================');
console.log(migrationContent);
console.log('\n');

// Instructions pour appliquer la migration
console.log('📋 INSTRUCTIONS POUR APPLIQUER LA MIGRATION:');
console.log('============================================');
console.log('');
console.log('1. Allez sur votre dashboard Supabase');
console.log('2. Naviguez vers SQL Editor');
console.log('3. Copiez-collez le contenu ci-dessus');
console.log('4. Exécutez la requête');
console.log('');
console.log('Ou utilisez la CLI Supabase:');
console.log('npx supabase db push --linked');
console.log('');
console.log('Ou connectez-vous d\'abord:');
console.log('npx supabase link --project-ref YOUR_PROJECT_REF');
console.log('npx supabase db push'); 