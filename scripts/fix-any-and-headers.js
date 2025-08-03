const fs = require('fs');
const path = require('path');

// Configuration
const API_DIRS = [
  'src/app/api/v1',
  'src/app/api/v2', 
  'src/app/api/chat'
];

// Patterns de correction
const FIXES = {
  // Types any dans les paramètres de fonction
  paramsAny: {
    pattern: /\(\{ params \}: any\)/g,
    replacement: '({ params }: { params: Promise<{ ref: string }> })'
  },
  
  // Types any dans les objets de données
  dataAny: {
    pattern: /const updateData: any =/g,
    replacement: 'const updateData: Record<string, unknown> ='
  },
  
  // Types any dans les tableaux
  arrayAny: {
    pattern: /children: any\[\]/g,
    replacement: 'children: ReturnType<typeof buildFolderTree>[]'
  },
  
  // Headers Content-Type manquants dans les réponses
  missingContentType: {
    pattern: /new Response\(JSON\.stringify\(([^)]+)\), \{ status: (\d+) \}\)/g,
    replacement: 'new Response(JSON.stringify($1), { status: $2, headers: { "Content-Type": "application/json" } })'
  },
  
  // Headers Content-Type manquants dans NextResponse
  missingContentTypeNextResponse: {
    pattern: /NextResponse\.json\(([^,]+), \{ status: (\d+) \}\)/g,
    replacement: 'NextResponse.json($1, { status: $2, headers: { "Content-Type": "application/json" } })'
  }
};

// Fonction de correction
function fixAnyAndHeaders(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Appliquer toutes les corrections
  for (const [fixName, fix] of Object.entries(FIXES)) {
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
      const fixed = fixAnyAndHeaders(fullPath);
      if (fixed) {
        results.push(fullPath);
      }
      console.log('');
    }
  }
  
  return results;
}

// Exécution
console.log('🔧 CORRECTION DES TYPES ANY ET HEADERS');
console.log('=======================================\n');

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