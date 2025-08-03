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
  // Ajouter l'import NextRequest manquant
  missingNextRequestImport: {
    pattern: /import.*NextRequest.*from.*next\/server/g,
    test: (content) => !content.includes('import { NextRequest } from \'next/server\'') && content.includes('NextRequest'),
    fix: (content) => {
      const importLine = content.match(/import.*from.*next\/server/);
      if (importLine) {
        return content.replace(importLine[0], importLine[0].replace('}', ', NextRequest }'));
      } else {
        return content.replace(/import.*from.*next\/server/, 'import { NextRequest } from \'next/server\'');
      }
    }
  },
  
  // Ajouter l'import NextResponse manquant
  missingNextResponseImport: {
    pattern: /import.*NextResponse.*from.*next\/server/g,
    test: (content) => !content.includes('import { NextResponse } from \'next/server\'') && content.includes('NextResponse'),
    fix: (content) => {
      const importLine = content.match(/import.*from.*next\/server/);
      if (importLine) {
        return content.replace(importLine[0], importLine[0].replace('}', ', NextResponse }'));
      } else {
        return content.replace(/import.*from.*next\/server/, 'import { NextResponse } from \'next/server\'');
      }
    }
  },
  
  // Ajouter les codes de statut HTTP manquants dans les réponses d'erreur
  missingStatusCodes: {
    pattern: /new Response\(JSON\.stringify\(\{ error: [^}]+ \}\), \{ headers: \{ "Content-Type": "application\/json" \} \}\)/g,
    replacement: 'new Response(JSON.stringify({ error: $1 }), { status: 500, headers: { "Content-Type": "application/json" } })'
  },
  
  // Ajouter les codes de statut HTTP manquants dans NextResponse
  missingStatusCodesNextResponse: {
    pattern: /NextResponse\.json\(\{ error: [^}]+ \}, \{ headers: \{ "Content-Type": "application\/json" \} \}\)/g,
    replacement: 'NextResponse.json({ error: $1 }, { status: 500, headers: { "Content-Type": "application/json" } })'
  }
};

// Fonction de correction
function fixNextJsTypesAndStatus(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Appliquer toutes les corrections
  for (const [fixName, fix] of Object.entries(FIXES)) {
    if (fix.test && fix.test(content)) {
      content = fix.fix(content);
      modified = true;
      console.log(`  ✅ Corrigé: ${fixName}`);
    } else if (fix.pattern && fix.pattern.test(content)) {
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
      const fixed = fixNextJsTypesAndStatus(fullPath);
      if (fixed) {
        results.push(fullPath);
      }
      console.log('');
    }
  }
  
  return results;
}

// Exécution
console.log('🔧 CORRECTION DES TYPES NEXT.JS ET CODES DE STATUT');
console.log('==================================================\n');

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