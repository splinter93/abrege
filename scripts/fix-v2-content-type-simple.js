const fs = require('fs');
const path = require('path');

// Configuration
const API_V2_DIR = 'src/app/api/v2';

// Fonction de correction des headers Content-Type
function fixContentTypeHeaders(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern générique pour NextResponse.json avec status mais sans headers
  const pattern = /NextResponse\.json\(([^,]+), \{ status: (\d+) \}\)/g;
  if (pattern.test(content)) {
    content = content.replace(pattern, 'NextResponse.json($1, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Headers Content-Type`);
  }
  
  // Pattern pour NextResponse.json sans status (ajouter headers)
  const patternNoStatus = /NextResponse\.json\(([^,]+)\)/g;
  if (patternNoStatus.test(content)) {
    content = content.replace(patternNoStatus, 'NextResponse.json($1, { headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Headers Content-Type (sans status)`);
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
      const fixed = fixContentTypeHeaders(fullPath);
      if (fixed) {
        results.push(fullPath);
      }
      console.log('');
    }
  }
  
  return results;
}

// Exécution
console.log('🔧 CORRECTION SIMPLE DES HEADERS CONTENT-TYPE API V2');
console.log('====================================================\n');

const fixedFiles = scanAndFix(API_V2_DIR);

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