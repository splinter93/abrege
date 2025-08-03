const fs = require('fs');
const path = require('path');

// Configuration
const API_V2_DIR = 'src/app/api/v2';

// Liste des fichiers à corriger manuellement
const FILES_TO_FIX = [
  'src/app/api/v2/classeur/[ref]/update/route.ts',
  'src/app/api/v2/classeur/create/route.ts',
  'src/app/api/v2/folder/[ref]/delete/route.ts',
  'src/app/api/v2/folder/[ref]/tree/route.ts',
  'src/app/api/v2/folder/[ref]/update/route.ts',
  'src/app/api/v2/note/[ref]/add-content/route.ts',
  'src/app/api/v2/note/[ref]/content/route.ts',
  'src/app/api/v2/note/[ref]/delete/route.ts',
  'src/app/api/v2/note/[ref]/insights/route.ts',
  'src/app/api/v2/note/[ref]/merge/route.ts',
  'src/app/api/v2/note/[ref]/metadata/route.ts',
  'src/app/api/v2/note/[ref]/move/route.ts',
  'src/app/api/v2/note/[ref]/publish/route.ts',
  'src/app/api/v2/note/[ref]/update/route.ts',
  'src/app/api/v2/note/create/route.ts'
];

// Fonction de correction des headers Content-Type
function fixContentTypeHeaders(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern 1: NextResponse.json avec status mais sans headers
  const pattern1 = /NextResponse\.json\(([^,]+), \{ status: (\d+) \}\)/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, 'NextResponse.json($1, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 1`);
  }
  
  // Pattern 2: NextResponse.json sans status (ajouter headers)
  const pattern2 = /NextResponse\.json\(([^,]+)\)/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, 'NextResponse.json($1, { headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 2`);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

// Fonction de correction en batch
function fixBatch() {
  const results = [];
  
  for (const filePath of FILES_TO_FIX) {
    if (fs.existsSync(filePath)) {
      console.log(`🔧 Correction de ${filePath}:`);
      const fixed = fixContentTypeHeaders(filePath);
      if (fixed) {
        results.push(filePath);
      }
      console.log('');
    }
  }
  
  return results;
}

// Exécution
console.log('🔧 CORRECTION BATCH DES HEADERS CONTENT-TYPE API V2');
console.log('==================================================\n');

const fixedFiles = fixBatch();

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