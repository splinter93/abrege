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
  // Remplacer USER_ID hardcodé
  hardcodedUserId: {
    pattern: /USER_ID/g,
    replacement: 'userId'
  },
  
  // Ajouter getAuthenticatedClient
  addAuth: {
    pattern: /export async function (GET|POST|PUT|DELETE|PATCH)\(request: NextRequest\)/g,
    replacement: `export async function $1(request: NextRequest) {
  try {
    const { supabase, userId } = await getAuthenticatedClient(request);`
  },
  
  // Ajouter import getAuthenticatedClient
  addAuthImport: {
    pattern: /import.*NextRequest.*from.*next\/server.*;/g,
    replacement: `import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  let userId: string;
  let userToken: string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    userToken = authHeader.substring(7);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: \`Bearer \${userToken}\`
        }
      }
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Token invalide ou expiré');
    }
    
    userId = user.id;
    return { supabase, userId };
  } else {
    throw new Error('Authentification requise');
  }
}`
  },
  
  // Remplacer types any
  replaceAny: {
    pattern: /: any/g,
    replacement: ': unknown'
  },
  
  // Ajouter gestion d'erreur
  addErrorHandling: {
    pattern: /export async function (GET|POST|PUT|DELETE|PATCH)\(request: NextRequest\) {/g,
    replacement: `export async function $1(request: NextRequest) {
  try {`
  },
  
  // Ajouter catch block
  addCatchBlock: {
    pattern: /return new Response\(JSON\.stringify\(.*\), { status: [0-9]+ }\);/g,
    replacement: `return new Response(JSON.stringify($1), { status: $2 });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }`
  }
};

// Fonction de correction
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Appliquer les corrections
  for (const [fixName, fix] of Object.entries(FIXES)) {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
      console.log(`  ✅ Appliqué: ${fixName}`);
    }
  }
  
  // Ajouter les headers Content-Type si manquants
  if (!content.includes('Content-Type')) {
    content = content.replace(
      /return new Response\(JSON\.stringify\(([^)]+)\), { status: ([0-9]+) }\);/g,
      'return new Response(JSON.stringify($1), { status: $2, headers: { "Content-Type": "application/json" } });'
    );
    modified = true;
    console.log(`  ✅ Ajouté: Headers Content-Type`);
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
      const fixed = fixFile(fullPath);
      if (fixed) {
        results.push(fullPath);
      }
      console.log('');
    }
  }
  
  return results;
}

// Exécution
console.log('🔧 CORRECTION AUTOMATIQUE DES PROBLÈMES CRITIQUES');
console.log('================================================\n');

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