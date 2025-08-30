#!/usr/bin/env node

/**
 * Script de migration automatique : /api/ui/ → /api/ui/
 * 
 * Ce script remplace toutes les références à l'ancienne API V1
 * par la nouvelle API UI dans tout le codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const SEARCH_PATTERN = /\/api\/v1\//g;
const REPLACEMENT = '/api/ui/';

// Extensions de fichiers à traiter
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];

// Fichiers et dossiers à ignorer
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'scripts/migrate-v1-to-ui.js' // Éviter de se traiter soi-même
];

/**
 * Vérifie si un chemin doit être ignoré
 */
function shouldIgnorePath(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Récupère tous les fichiers récursivement
 */
function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    
    if (shouldIgnorePath(fullPath)) {
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (stat.isFile() && FILE_EXTENSIONS.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Traite un fichier pour remplacer les références
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Vérifier si le fichier contient des références à /api/ui/
    if (!SEARCH_PATTERN.test(content)) {
      return { processed: false, changes: 0 };
    }
    
    // Remplacer les références
    const newContent = content.replace(SEARCH_PATTERN, REPLACEMENT);
    const changes = (content.match(SEARCH_PATTERN) || []).length;
    
    // Écrire le fichier modifié
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    return { processed: true, changes };
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    return { processed: false, error: error.message };
  }
}

/**
 * Fonction principale
 */
function main() {
  console.log('🚀 Début de la migration /api/ui/ → /api/ui/');
  console.log('================================================');
  
  // Récupérer tous les fichiers
  console.log('🔍 Recherche des fichiers...');
  const files = getAllFiles(ROOT_DIR);
  console.log(`📁 ${files.length} fichiers trouvés`);
  
  // Statistiques
  let totalProcessed = 0;
  let totalChanges = 0;
  let totalErrors = 0;
  const processedFiles = [];
  const errorFiles = [];
  
  // Traiter chaque fichier
  console.log('\n🔄 Traitement des fichiers...');
  for (const file of files) {
    const relativePath = path.relative(ROOT_DIR, file);
    const result = processFile(file);
    
    if (result.processed) {
      totalProcessed++;
      totalChanges += result.changes;
      processedFiles.push({ file: relativePath, changes: result.changes });
      
      if (result.changes > 0) {
        console.log(`✅ ${relativePath} (${result.changes} changements)`);
      }
    } else if (result.error) {
      totalErrors++;
      errorFiles.push({ file: relativePath, error: result.error });
      console.log(`❌ ${relativePath} - Erreur: ${result.error}`);
    }
  }
  
  // Résumé
  console.log('\n📊 RÉSUMÉ DE LA MIGRATION');
  console.log('============================');
  console.log(`✅ Fichiers traités avec succès: ${totalProcessed}`);
  console.log(`🔄 Total des changements: ${totalChanges}`);
  console.log(`❌ Fichiers en erreur: ${totalErrors}`);
  
  if (processedFiles.length > 0) {
    console.log('\n📝 FICHIERS MODIFIÉS:');
    processedFiles.forEach(({ file, changes }) => {
      if (changes > 0) {
        console.log(`  • ${file} (${changes} changements)`);
      }
    });
  }
  
  if (errorFiles.length > 0) {
    console.log('\n🚨 FICHIERS EN ERREUR:');
    errorFiles.forEach(({ file, error }) => {
      console.log(`  • ${file}: ${error}`);
    });
  }
  
  // Vérification finale
  console.log('\n🔍 Vérification finale...');
  const remainingV1Refs = getAllFiles(ROOT_DIR).filter(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      return SEARCH_PATTERN.test(content);
    } catch {
      return false;
    }
  });
  
  if (remainingV1Refs.length === 0) {
    console.log('✅ Aucune référence à /api/ui/ restante !');
  } else {
    console.log(`⚠️  ${remainingV1Refs.length} fichiers contiennent encore des références à /api/ui/`);
    remainingV1Refs.forEach(file => {
      const relativePath = path.relative(ROOT_DIR, file);
      console.log(`  • ${relativePath}`);
    });
  }
  
  console.log('\n🎉 Migration terminée !');
  
  if (totalErrors > 0) {
    console.log('\n⚠️  ATTENTION: Certains fichiers n\'ont pas pu être traités.');
    console.log('   Vérifiez les erreurs ci-dessus et relancez le script si nécessaire.');
    process.exit(1);
  }
}

// Exécuter le script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
