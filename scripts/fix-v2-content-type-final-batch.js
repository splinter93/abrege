const fs = require('fs');
const path = require('path');

// Configuration
const API_V2_DIR = 'src/app/api/v2';

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
  
  // Pattern 3: NextResponse.json avec error et status mais sans headers
  const pattern3 = /NextResponse\.json\(\{ error: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern3.test(content)) {
    content = content.replace(pattern3, 'NextResponse.json({ error: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 3`);
  }
  
  // Pattern 4: NextResponse.json avec success et status mais sans headers
  const pattern4 = /NextResponse\.json\(\{ success: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern4.test(content)) {
    content = content.replace(pattern4, 'NextResponse.json({ success: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 4`);
  }
  
  // Pattern 5: NextResponse.json avec message et status mais sans headers
  const pattern5 = /NextResponse\.json\(\{ message: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern5.test(content)) {
    content = content.replace(pattern5, 'NextResponse.json({ message: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 5`);
  }
  
  // Pattern 6: NextResponse.json avec content et status mais sans headers
  const pattern6 = /NextResponse\.json\(\{ content: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern6.test(content)) {
    content = content.replace(pattern6, 'NextResponse.json({ content: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 6`);
  }
  
  // Pattern 7: NextResponse.json avec data et status mais sans headers
  const pattern7 = /NextResponse\.json\(\{ data: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern7.test(content)) {
    content = content.replace(pattern7, 'NextResponse.json({ data: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 7`);
  }
  
  // Pattern 8: NextResponse.json avec classeur et status mais sans headers
  const pattern8 = /NextResponse\.json\(\{ classeur: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern8.test(content)) {
    content = content.replace(pattern8, 'NextResponse.json({ classeur: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 8`);
  }
  
  // Pattern 9: NextResponse.json avec folder et status mais sans headers
  const pattern9 = /NextResponse\.json\(\{ folder: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern9.test(content)) {
    content = content.replace(pattern9, 'NextResponse.json({ folder: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 9`);
  }
  
  // Pattern 10: NextResponse.json avec note et status mais sans headers
  const pattern10 = /NextResponse\.json\(\{ note: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern10.test(content)) {
    content = content.replace(pattern10, 'NextResponse.json({ note: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 10`);
  }
  
  // Pattern 11: NextResponse.json avec insights et status mais sans headers
  const pattern11 = /NextResponse\.json\(\{ insights: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern11.test(content)) {
    content = content.replace(pattern11, 'NextResponse.json({ insights: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 11`);
  }
  
  // Pattern 12: NextResponse.json avec metadata et status mais sans headers
  const pattern12 = /NextResponse\.json\(\{ metadata: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern12.test(content)) {
    content = content.replace(pattern12, 'NextResponse.json({ metadata: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 12`);
  }
  
  // Pattern 13: NextResponse.json avec tree et status mais sans headers
  const pattern13 = /NextResponse\.json\(\{ tree: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern13.test(content)) {
    content = content.replace(pattern13, 'NextResponse.json({ tree: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 13`);
  }
  
  // Pattern 14: NextResponse.json avec ref et status mais sans headers
  const pattern14 = /NextResponse\.json\(\{ ref: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern14.test(content)) {
    content = content.replace(pattern14, 'NextResponse.json({ ref: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 14`);
  }
  
  // Pattern 15: NextResponse.json avec id et status mais sans headers
  const pattern15 = /NextResponse\.json\(\{ id: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern15.test(content)) {
    content = content.replace(pattern15, 'NextResponse.json({ id: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 15`);
  }
  
  // Pattern 16: NextResponse.json avec name et status mais sans headers
  const pattern16 = /NextResponse\.json\(\{ name: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern16.test(content)) {
    content = content.replace(pattern16, 'NextResponse.json({ name: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 16`);
  }
  
  // Pattern 17: NextResponse.json avec title et status mais sans headers
  const pattern17 = /NextResponse\.json\(\{ title: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern17.test(content)) {
    content = content.replace(pattern17, 'NextResponse.json({ title: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 17`);
  }
  
  // Pattern 18: NextResponse.json avec content et status mais sans headers (version complexe)
  const pattern18 = /NextResponse\.json\(\{ content: \{([^}]+)\} \}, \{ status: (\d+) \}\)/g;
  if (pattern18.test(content)) {
    content = content.replace(pattern18, 'NextResponse.json({ content: {$1} }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 18`);
  }
  
  // Pattern 19: NextResponse.json avec success, message et status mais sans headers
  const pattern19 = /NextResponse\.json\(\{ success: true, message: ([^}]+) \}, \{ status: (\d+) \}\)/g;
  if (pattern19.test(content)) {
    content = content.replace(pattern19, 'NextResponse.json({ success: true, message: $1 }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 19`);
  }
  
  // Pattern 20: NextResponse.json avec success, message, classeurId et status mais sans headers
  const pattern20 = /NextResponse\.json\(\{ success: true, message: ([^}]+), classeurId \}, \{ status: (\d+) \}\)/g;
  if (pattern20.test(content)) {
    content = content.replace(pattern20, 'NextResponse.json({ success: true, message: $1, classeurId }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 20`);
  }
  
  // Pattern 21: NextResponse.json avec success, message, folderId et status mais sans headers
  const pattern21 = /NextResponse\.json\(\{ success: true, message: ([^}]+), folderId \}, \{ status: (\d+) \}\)/g;
  if (pattern21.test(content)) {
    content = content.replace(pattern21, 'NextResponse.json({ success: true, message: $1, folderId }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 21`);
  }
  
  // Pattern 22: NextResponse.json avec success, message, noteId et status mais sans headers
  const pattern22 = /NextResponse\.json\(\{ success: true, message: ([^}]+), noteId \}, \{ status: (\d+) \}\)/g;
  if (pattern22.test(content)) {
    content = content.replace(pattern22, 'NextResponse.json({ success: true, message: $1, noteId }, { status: $2, headers: { "Content-Type": "application/json" } })');
    modified = true;
    console.log(`  ✅ Corrigé: Pattern 22`);
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
console.log('🔧 CORRECTION FINALE BATCH DES HEADERS CONTENT-TYPE API V2');
console.log('==========================================================\n');

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