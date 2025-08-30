const fs = require('fs');
const path = require('path');

console.log('🔧 Correction des erreurs de parsing...');

const filesToFix = [
  'src/app/api/ui/note/[ref]/add-to-section/route.ts',
  'src/app/api/ui/note/[ref]/clear-section/route.ts',
  'src/app/api/ui/note/[ref]/information/route.ts',
  'src/app/api/ui/note/[ref]/statistics/route.ts',
  'src/app/api/ui/note/[ref]/table-of-contents/route.ts',
  'src/app/api/ui/note/merge/route.ts',
  'src/app/api/ui/note/overwrite/route.ts'
];

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = false;
  
  // 1. Corriger les doubles accolades à la fin
  if (content.match(/}\s*}\s*$/)) {
    content = content.replace(/}\s*}\s*$/, '}');
    fixed = true;
  }
  
  // 2. Corriger USER_ID par userId
  if (content.includes('USER_ID')) {
    content = content.replace(/USER_ID/g, 'userId');
    fixed = true;
  }
  
  // 3. Corriger les imports manquants
  if (!content.includes('import type { NextRequest }')) {
    content = content.replace(
      /import.*NextRequest.*from.*next\/server.*;/g,
      'import type { NextRequest } from \'next/server\';'
    );
  }
  
  // 4. Ajouter la fonction getAuthenticatedClient si manquante
  if (!content.includes('getAuthenticatedClient')) {
    const authFunction = `
/**
 * Récupère le token d'authentification et crée un client Supabase authentifié
 */
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
}`;
    
    // Insérer après les imports
    const importEndIndex = content.indexOf('const supabaseUrl');
    if (importEndIndex !== -1) {
      const beforeImports = content.substring(0, importEndIndex);
      const afterImports = content.substring(importEndIndex);
      content = beforeImports + authFunction + '\n\n' + afterImports;
      fixed = true;
    }
  }
  
  if (fixed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corrigé: ${filePath}`);
  } else {
    console.log(`⚠️  Aucune correction nécessaire: ${filePath}`);
  }
});

console.log('🎉 Correction des erreurs de parsing terminée !'); 