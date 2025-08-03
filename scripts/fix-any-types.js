const fs = require('fs');
const path = require('path');

// Configuration
const API_DIRS = [
  'src/app/api/v1',
  'src/app/api/v2', 
  'src/app/api/chat'
];

// Pattern de correction
const ANY_PATTERN = /catch \(err: any\)/g;
const ANY_REPLACEMENT = 'catch (err: unknown)';

// Pattern pour corriger l'utilisation de err dans le catch
const ERR_USAGE_PATTERN = /console\.error\(.*err\.message.*\)/g;
const ERR_USAGE_REPLACEMENT = (match) => {
  return match.replace(/err\.message/g, 'error.message');
};

// Fonction de correction
function fixAnyTypes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remplacer catch (err: any) par catch (err: unknown)
  if (ANY_PATTERN.test(content)) {
    content = content.replace(ANY_PATTERN, ANY_REPLACEMENT);
    modified = true;
    console.log(`  ✅ Remplacé: catch (err: any) → catch (err: unknown)`);
  }
  
  // Ajouter const error = err as Error; après le catch
  if (content.includes('catch (err: unknown)')) {
    const catchBlockPattern = /catch \(err: unknown\) \{/g;
    if (catchBlockPattern.test(content)) {
      content = content.replace(catchBlockPattern, `catch (err: unknown) {
    const error = err as Error;`);
      modified = true;
      console.log(`  ✅ Ajouté: const error = err as Error;`);
    }
  }
  
  // Corriger l'utilisation de err.message par error.message
  if (content.includes('err.message') && content.includes('const error = err as Error;')) {
    content = content.replace(/err\.message/g, 'error.message');
    modified = true;
    console.log(`  ✅ Corrigé: err.message → error.message`);
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
      const fixed = fixAnyTypes(fullPath);
      if (fixed) {
        results.push(fullPath);
      }
      console.log('');
    }
  }
  
  return results;
}

// Exécution
console.log('🔧 CORRECTION DES TYPES ANY');
console.log('============================\n');

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