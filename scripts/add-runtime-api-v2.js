#!/usr/bin/env node

/**
 * Script pour ajouter runtime nodejs à tous les endpoints API v2
 * FIX: Edge Runtime ne supporte pas SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs');
const path = require('path');

const RUNTIME_CONFIG = `
// ✅ FIX PROD: Force Node.js runtime pour accès aux variables d'env (SUPABASE_SERVICE_ROLE_KEY)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
`;

// Fonction récursive pour trouver tous les route.ts
function findRouteFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (item.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Trouver tous les fichiers route.ts dans api/v2
const apiV2Dir = path.join(process.cwd(), 'src/app/api/v2');
const files = findRouteFiles(apiV2Dir);

console.log(`🔍 Trouvé ${files.length} fichiers API v2`);

let modified = 0;
let skipped = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Vérifier si le fichier a déjà la config
  if (content.includes('export const runtime')) {
    console.log(`  ⏭️  Déjà configuré: ${path.relative(process.cwd(), file)}`);
    skipped++;
    return;
  }
  
  // Trouver la première ligne d'import
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Trouver la fin des imports
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      insertIndex = i + 1;
    } else if (insertIndex > 0 && !lines[i].startsWith('import ') && lines[i].trim() !== '') {
      break;
    }
  }
  
  // Insérer la config runtime après les imports
  lines.splice(insertIndex, 0, RUNTIME_CONFIG);
  
  // Écrire le fichier modifié
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  
  console.log(`  ✅ Modifié: ${path.relative(process.cwd(), file)}`);
  modified++;
});

console.log(`\n✅ Terminé !`);
console.log(`  - Modifiés: ${modified}`);
console.log(`  - Ignorés: ${skipped}`);
console.log(`  - Total: ${files.length}`);

