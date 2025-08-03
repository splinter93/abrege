const fs = require('fs');
const path = require('path');

// Configuration
const API_V2_DIR = 'src/app/api/v2';

// Patterns de correction pour l'API V2
const V2_FIXES = {
  // Headers Content-Type manquants
  contentType: {
    pattern: /NextResponse\.json\(([^,]+), \{ status: (\d+) \}\)/g,
    replacement: 'NextResponse.json($1, { status: $2, headers: { "Content-Type": "application/json" } })'
  },
  
  // Gestion d'erreur manquante - ajouter catch blocks
  errorHandling: {
    pattern: /} catch \(error\) {/g,
    replacement: '} catch (err: unknown) {\n    const error = err as Error;'
  },
  
  // Authentification manquante - ajouter getAuthenticatedUser
  authMissing: {
    pattern: /export async function (GET|POST|PUT|DELETE|PATCH)\(/g,
    replacement: 'export async function $1('
  }
};

// Fonction de correction complète
function fixV2File(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 1. Corriger les headers Content-Type
  if (V2_FIXES.contentType.pattern.test(content)) {
    content = content.replace(V2_FIXES.contentType.pattern, V2_FIXES.contentType.replacement);
    modified = true;
    console.log(`  ✅ Corrigé: Headers Content-Type`);
  }
  
  // 2. Corriger la gestion d'erreur
  if (content.includes('} catch (error) {') && !content.includes('const error = err as Error;')) {
    content = content.replace(/} catch \(error\) {/g, '} catch (err: unknown) {\n    const error = err as Error;');
    modified = true;
    console.log(`  ✅ Corrigé: Gestion d'erreur`);
  }
  
  // 3. Ajouter l'authentification manquante pour les endpoints spécifiques
  const needsAuth = [
    'classeur/create',
    'folder/create', 
    'note/[ref]/metadata'
  ];
  
  const needsAuthFile = needsAuth.some(auth => filePath.includes(auth));
  if (needsAuthFile && !content.includes('getAuthenticatedUser')) {
    // Ajouter l'import si manquant
    if (!content.includes('import { getAuthenticatedUser }')) {
      content = content.replace(
        /import { NextRequest, NextResponse } from 'next\/server';/,
        `import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/utils/authUtils';`
      );
    }
    
    // Ajouter l'authentification dans la fonction
    const functionMatch = content.match(/export async function (GET|POST|PUT|DELETE|PATCH)\([^)]*\): Promise<NextResponse> {/);
    if (functionMatch) {
      const authBlock = `
  // 🔐 Authentification
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = authResult.userId!;`;
      
      content = content.replace(
        /export async function (GET|POST|PUT|DELETE|PATCH)\([^)]*\): Promise<NextResponse> {/,
        `export async function $1(request: NextRequest, { params }: { params: Promise<{ ref: string }> }): Promise<NextResponse> {${authBlock}`
      );
      
      modified = true;
      console.log(`  ✅ Corrigé: Authentification ajoutée`);
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
      const fixed = fixV2File(fullPath);
      if (fixed) {
        results.push(fullPath);
      }
      console.log('');
    }
  }
  
  return results;
}

// Exécution
console.log('🔧 CORRECTION COMPLÈTE API V2');
console.log('==============================\n');

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