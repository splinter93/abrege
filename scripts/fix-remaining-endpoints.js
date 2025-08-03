const fs = require('fs');
const path = require('path');

// Liste des endpoints restants à corriger
const endpoints = [
  'src/app/api/v1/note/publish/route.ts',
  'src/app/api/v1/note/merge/route.ts',
  'src/app/api/v1/note/[ref]/table-of-contents/route.ts',
  'src/app/api/v1/note/[ref]/clear-section/route.ts',
  'src/app/api/v1/note/overwrite/route.ts',
  'src/app/api/v1/note/[ref]/content/delete/route.ts',
  'src/app/api/v1/note/[ref]/content/route.ts',
  'src/app/api/v1/note/[ref]/add-to-section/route.ts',
  'src/app/api/v1/note/[ref]/section/route.ts',
  'src/app/api/v1/note/[ref]/add-content/route.ts',
  'src/app/api/v1/note/[ref]/statistics/route.ts',
  'src/app/api/v1/note/[ref]/information/route.ts'
];

// Template pour la fonction getAuthenticatedClient
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

// Template pour la gestion d'erreur d'authentification
const authErrorHandling = `
  } catch (err: any) {
    if (err.message === 'Token invalide ou expiré' || err.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: err.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }`;

console.log('🔧 Correction des endpoints restants...');

endpoints.forEach(endpoint => {
  const filePath = path.join(process.cwd(), endpoint);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${endpoint}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Supprimer le client Supabase global
  content = content.replace(/const supabase = createClient\(supabaseUrl, supabaseAnonKey\);/g, '');
  
  // 2. Ajouter la fonction getAuthenticatedClient après les imports
  const importEndIndex = content.indexOf('const supabaseUrl');
  if (importEndIndex !== -1) {
    const beforeImports = content.substring(0, importEndIndex);
    const afterImports = content.substring(importEndIndex);
    content = beforeImports + afterImports.replace(/const supabaseUrl[\s\S]*?const supabaseAnonKey[\s\S]*?;/g, 
      `const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

${authFunction}`);
  }
  
  // 3. Remplacer USER_ID par userId et ajouter getAuthenticatedClient
  content = content.replace(/const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";/g, 
    'const { supabase, userId } = await getAuthenticatedClient(req);');
  
  // 4. Ajouter la gestion d'erreur d'authentification
  content = content.replace(/} catch \(err: any\) \{[\s\S]*?return new Response\(JSON\.stringify\(\{ error: err\.message \}\), \{ status: 500 \}\);/g,
    authErrorHandling);
  
  // 5. Ajouter NextRequest import si nécessaire
  if (!content.includes('NextRequest')) {
    content = content.replace(/import.*NextRequest.*from.*next\/server.*;/g, 
      'import type { NextRequest } from \'next/server\';');
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Corrigé: ${endpoint}`);
});

console.log('🎉 Correction terminée !'); 