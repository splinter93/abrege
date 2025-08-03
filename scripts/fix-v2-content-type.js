const fs = require('fs');
const path = require('path');

// Configuration
const API_V2_DIR = 'src/app/api/v2';

// Patterns de correction pour les headers Content-Type
const CONTENT_TYPE_FIXES = {
  // NextResponse.json sans headers
  nextResponseNoHeaders: {
    pattern: /NextResponse\.json\(([^,]+), \{ status: (\d+) \}\)/g,
    replacement: 'NextResponse.json($1, { status: $2, headers: { "Content-Type": "application/json" } })'
  },
  
  // NextResponse.json avec error sans headers
  nextResponseErrorNoHeaders: {
    pattern: /NextResponse\.json\(\{ error: ([^}]+) \}, \{ status: (\d+) \}\)/g,
    replacement: 'NextResponse.json({ error: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })'
  },
  
  // NextResponse.json avec success sans headers
  nextResponseSuccessNoHeaders: {
    pattern: /NextResponse\.json\(\{ success: ([^}]+) \}, \{ status: (\d+) \}\)/g,
    replacement: 'NextResponse.json({ success: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })'
  }
};

// Fonction de correction
function fixContentTypeHeaders(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Appliquer toutes les corrections
  for (const [fixName, fix] of Object.entries(CONTENT_TYPE_FIXES)) {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
      console.log(`  ✅ Corrigé: ${fixName}`);
    }
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
console.log('🔧 CORRECTION DES HEADERS CONTENT-TYPE API V2');
console.log('=============================================\n');

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