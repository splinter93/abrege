const fs = require('fs');
const path = require('path');

// Liste des fichiers API v2 à corriger (sauf ceux déjà corrigés)
const filesToFix = [
  'src/app/api/v2/classeur/[ref]/tree/route.ts',
  'src/app/api/v2/note/[ref]/clear-section/route.ts',
  'src/app/api/v2/note/[ref]/content/route.ts',
  'src/app/api/v2/note/[ref]/metadata/route.ts',
  'src/app/api/v2/note/[ref]/add-to-section/route.ts',
  'src/app/api/v2/note/[ref]/publish/route.ts',
  'src/app/api/v2/note/[ref]/insert/route.ts',
  'src/app/api/v2/note/[ref]/merge/route.ts',
  'src/app/api/v2/note/[ref]/add-content/route.ts',
  'src/app/api/v2/note/[ref]/table-of-contents/route.ts',
  'src/app/api/v2/note/[ref]/insights/route.ts',
  'src/app/api/v2/note/[ref]/erase-section/route.ts',
  'src/app/api/v2/note/[ref]/statistics/route.ts',
  'src/app/api/v2/folder/[ref]/tree/route.ts'
];

function fixApiV2File(filePath) {
  console.log(`🔧 Correction de ${filePath}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Vérifier si le fichier utilise déjà un client authentifié
    if (content.includes('createClient(supabaseUrl, supabaseAnonKey, {')) {
      console.log(`✅ ${filePath} déjà corrigé`);
      return;
    }
    
    // Remplacer la création du client anonyme
    const oldPattern = /const supabase = createClient\(supabaseUrl, supabaseAnonKey\);/;
    const newPattern = `const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;`;
    
    if (content.includes('const supabase = createClient(supabaseUrl, supabaseAnonKey);')) {
      // Supprimer la ligne de création du client anonyme
      content = content.replace(/const supabase = createClient\(supabaseUrl, supabaseAnonKey\);/g, '');
      
      // Ajouter la logique d'authentification après getAuthenticatedUser
      const authPattern = /const userId = authResult\.userId!;/;
      const authReplacement = `const userId = authResult.userId!;
  
  // Récupérer le token d'authentification
  const authHeader = request.headers.get('Authorization');
  const userToken = authHeader?.substring(7);
  
  if (!userToken) {
    logApi('${getOperationName(filePath)}', '❌ Token manquant', context);
    return NextResponse.json(
      { error: 'Token d\\'authentification manquant' },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Créer un client Supabase authentifié
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: \`Bearer \${userToken}\`
      }
    }
  });`;
      
      content = content.replace(authPattern, authReplacement);
      
      // Écrire le fichier modifié
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath} corrigé`);
    } else {
      console.log(`⚠️  ${filePath} ne contient pas le pattern attendu`);
    }
    
  } catch (error) {
    console.error(`❌ Erreur lors de la correction de ${filePath}:`, error.message);
  }
}

function getOperationName(filePath) {
  // Extraire le nom de l'opération à partir du chemin du fichier
  const parts = filePath.split('/');
  const operation = parts[parts.length - 2] || 'unknown';
  return `v2_${operation}`;
}

console.log('🔧 Correction des endpoints API v2 pour RLS...\n');

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    fixApiV2File(filePath);
  } else {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
  }
});

console.log('\n✅ Correction terminée !');
console.log('\n📋 Résumé des corrections :');
console.log('- Suppression des clients Supabase anonymes');
console.log('- Ajout de la logique d\'authentification avec token');
console.log('- Configuration des clients Supabase authentifiés');
console.log('\n🎯 Les endpoints API v2 devraient maintenant fonctionner avec RLS !'); 