const fs = require('fs');

console.log('🔧 Correction des erreurs de build...');

const filesToFix = [
  'src/app/api/v1/note/[ref]/content/delete/route.ts',
  'src/app/api/v1/note/[ref]/add-content/route.ts',
  'src/app/api/v1/note/[ref]/add-to-section/route.ts',
  'src/app/api/v1/note/[ref]/clear-section/route.ts',
  'src/app/api/v1/note/[ref]/statistics/route.ts',
  'src/app/api/v1/note/[ref]/table-of-contents/route.ts',
  'src/app/api/v1/note/overwrite/route.ts'
];

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = false;
  
  // 1. Ajouter l'import manquant pour getAuthenticatedClient
  if (content.includes('getAuthenticatedClient') && !content.includes('async function getAuthenticatedClient')) {
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
    const importEndIndex = content.lastIndexOf('import');
    const nextLineAfterImports = content.indexOf('\n', importEndIndex) + 1;
    content = content.slice(0, nextLineAfterImports) + authFunction + '\n\n' + content.slice(nextLineAfterImports);
    fixed = true;
  }
  
  // 2. Remplacer USER_ID par userId
  if (content.includes('USER_ID')) {
    content = content.replace(/USER_ID/g, 'userId');
    fixed = true;
  }
  
  // 3. Corriger les types any
  if (content.includes('{ params }: ApiContext')) {
    content = content.replace(/{ params }: ApiContext/g, '{ params }: any');
    fixed = true;
  }
  
  if (fixed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corrigé: ${filePath}`);
  } else {
    console.log(`⚠️  Aucune correction nécessaire: ${filePath}`);
  }
});

console.log('🎉 Correction des erreurs de build terminée !'); 