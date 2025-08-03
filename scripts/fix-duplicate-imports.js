const fs = require('fs');
const path = require('path');

// Configuration
const API_DIRS = [
  'src/app/api/v1',
  'src/app/api/v2', 
  'src/app/api/chat'
];

// Fonction de correction
function fixDuplicateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Corriger les imports dupliqués NextResponse
  if (content.includes('import { NextResponse, NextResponse } from \'next/server\'')) {
    content = content.replace('import { NextResponse, NextResponse } from \'next/server\'', 'import { NextResponse } from \'next/server\'');
    modified = true;
    console.log(`  ✅ Corrigé: Import NextResponse dupliqué`);
  }
  
  // Corriger les imports dupliqués NextRequest
  if (content.includes('import { NextRequest, NextRequest } from \'next/server\'')) {
    content = content.replace('import { NextRequest, NextRequest } from \'next/server\'', 'import { NextRequest } from \'next/server\'');
    modified = true;
    console.log(`  ✅ Corrigé: Import NextRequest dupliqué`);
  }
  
  // Corriger les imports avec NextRequest et NextResponse dupliqués
  if (content.includes('import { NextRequest, NextRequest, NextResponse } from \'next/server\'')) {
    content = content.replace('import { NextRequest, NextRequest, NextResponse } from \'next/server\'', 'import { NextRequest, NextResponse } from \'next/server\'');
    modified = true;
    console.log(`  ✅ Corrigé: Imports NextRequest et NextResponse dupliqués`);
  }
  
  if (content.includes('import { NextRequest, NextResponse, NextResponse } from \'next/server\'')) {
    content = content.replace('import { NextRequest, NextResponse, NextResponse } from \'next/server\'', 'import { NextRequest, NextResponse } from \'next/server\'');
    modified = true;
    console.log(`  ✅ Corrigé: Import NextResponse dupliqué avec NextRequest`);
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
      const fixed = fixDuplicateImports(fullPath);
      if (fixed) {
        results.push(fullPath);
      }
      console.log('');
    }
  }
  
  return results;
}

// Exécution
console.log('🔧 CORRECTION DES IMPORTS DUPLIQUÉS');
console.log('====================================\n');

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