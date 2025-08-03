const fs = require('fs');
const path = require('path');

// Configuration
const API_DIRS = [
  'src/app/api/v1',
  'src/app/api/v2', 
  'src/app/api/chat'
];

// Pattern de correction
const DUPLICATE_ERROR_PATTERN = /const error = err as Error;\s*const error = err as Error;/g;
const DUPLICATE_ERROR_REPLACEMENT = 'const error = err as Error;';

// Fonction de correction
function fixDuplicateError(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remplacer les duplications de const error = err as Error;
  if (DUPLICATE_ERROR_PATTERN.test(content)) {
    content = content.replace(DUPLICATE_ERROR_PATTERN, DUPLICATE_ERROR_REPLACEMENT);
    modified = true;
    console.log(`  ✅ Corrigé: Duplication de const error = err as Error;`);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

// Fonction de scan récursif
function scanAndFix(dir) {
  const results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results.push(...scanAndFix(fullPath));
    } else if (item.endsWith('.ts') && item.includes('route')) {
      console.log(`🔧 Correction de ${fullPath}:`);
      const fixed = fixDuplicateError(fullPath);
      if (fixed) {
        results.push(fullPath);
      }
      console.log('');
    }
  }
  
  return results;
}

// Exécution
console.log('🔧 CORRECTION DES DUPLICATIONS ERROR');
console.log('=====================================\n');

const fixedFiles = [];

for (const apiDir of API_DIRS) {
  console.log(`📁 Correction de ${apiDir}:`);
  const results = scanAndFix(apiDir);
  fixedFiles.push(...results);
}

console.log('📊 RÉSUMÉ DES CORRECTIONS');
console.log('==========================');
console.log(`Fichiers corrigés: ${fixedFiles.length}`);
console.log(`Fichiers traités: ${fixedFiles.join(', ')}`);

if (fixedFiles.length > 0) {
  console.log('\n✅ CORRECTIONS APPLIQUÉES AVEC SUCCÈS');
  console.log('⚠️  Vérifiez les fichiers corrigés avant commit');
} else {
  console.log('\nℹ️  Aucun fichier nécessitant une correction automatique');
} 