#!/usr/bin/env node

/**
 * Script de migration des slugs
 * 
 * Ce script ajoute des slugs aux ressources existantes qui n'en ont pas encore.
 * 
 * Usage:
 *   node scripts/migrate-slugs.js
 */

const { migrateSlugs } = require('../dist/scripts/migrateSlugs');

async function runMigration() {
  console.log('🚀 Lancement de la migration des slugs...');
  console.log('==========================================');
  
  try {
    await migrateSlugs();
    console.log('✅ Migration terminée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

runMigration(); 