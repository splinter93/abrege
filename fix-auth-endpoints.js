const fs = require('fs');
const path = require('path');

// Liste des endpoints à corriger
const endpointsToFix = [
  'src/app/api/v1/notebooks/route.ts',
  'src/app/api/v1/classeur/[ref]/full-tree/route.ts',
  'src/app/api/v1/classeur/[ref]/dossiers/route.ts',
  'src/app/api/v1/classeur/[ref]/meta/route.ts',
  'src/app/api/v1/notebook/[ref]/route.ts',
  'src/app/api/v1/classeur/reorder/route.ts',
  'src/app/api/v1/notebook/create/route.ts',
  'src/app/api/v1/dossier/[ref]/meta/route.ts',
  'src/app/api/v1/dossier/[ref]/notes/route.ts',
  'src/app/api/v1/dossier/[ref]/tree/route.ts',
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
const authFunctionTemplate = `
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
}
`;

// Template pour le remplacement du USER_ID hardcodé
const replacementTemplate = `
    const { supabase, userId } = await getAuthenticatedClient(req);
`;

// Template pour la gestion d'erreur d'authentification
const errorHandlingTemplate = `
  } catch (err: any) {
    if (err.message === 'Token invalide ou expiré' || err.message === 'Authentification requise') {
      return new Response(JSON.stringify({ error: err.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
`;

function fixEndpoint(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Ajouter l'import createClient si nécessaire
    if (!content.includes('createClient') && content.includes('@supabase/supabase-js')) {
      content = content.replace(
        'import { createClient } from \'@supabase/supabase-js\';',
        'import { createClient } from \'@supabase/supabase-js\';'
      );
    }

    // 2. Supprimer le client Supabase anonyme global
    content = content.replace(
      /const supabase = createClient\(supabaseUrl, supabaseAnonKey\);/g,
      ''
    );

    // 3. Ajouter la fonction getAuthenticatedClient après les imports
    if (!content.includes('getAuthenticatedClient')) {
      const importEndIndex = content.indexOf('const supabaseUrl');
      if (importEndIndex !== -1) {
        content = content.slice(0, importEndIndex) + authFunctionTemplate + '\n' + content.slice(importEndIndex);
      }
    }

    // 4. Remplacer les USER_ID hardcodés
    content = content.replace(
      /const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";/g,
      ''
    );

    // 5. Remplacer les utilisations de USER_ID par userId
    content = content.replace(
      /resolveNoteRef\(ref, USER_ID\)/g,
      'resolveNoteRef(ref, userId)'
    );
    content = content.replace(
      /resolveFolderRef\(ref, USER_ID\)/g,
      'resolveFolderRef(ref, userId)'
    );
    content = content.replace(
      /resolveClasseurRef\(ref, USER_ID\)/g,
      'resolveClasseurRef(ref, userId)'
    );
    content = content.replace(
      /\.eq\('user_id', USER_ID\)/g,
      '.eq(\'user_id\', userId)'
    );

    // 6. Ajouter l'authentification dans les fonctions
    const functionMatches = content.match(/export async function \w+\([^)]*\)[^{]*{/g);
    if (functionMatches) {
      functionMatches.forEach(match => {
        const functionName = match.match(/export async function (\w+)/)[1];
        const functionStart = content.indexOf(match);
        const functionEnd = content.indexOf('}', functionStart);
        
        // Vérifier si la fonction a déjà l'authentification
        const functionContent = content.slice(functionStart, functionEnd);
        if (!functionContent.includes('getAuthenticatedClient') && functionContent.includes('USER_ID')) {
          // Ajouter l'authentification après les validations
          const validationEnd = functionContent.indexOf('const USER_ID');
          if (validationEnd !== -1) {
            const beforeAuth = content.slice(0, functionStart + validationEnd);
            const afterAuth = content.slice(functionStart + validationEnd);
            content = beforeAuth + replacementTemplate + afterAuth;
          }
        }
      });
    }

    // 7. Améliorer la gestion d'erreur
    content = content.replace(
      /} catch \(err: any\) \{[\s\S]*?return new Response\(JSON\.stringify\(\{ error: err\.message \}\), \{ status: 500 \}\);/g,
      errorHandlingTemplate
    );

    if (content !== fs.readFileSync(filePath, 'utf8')) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Corrigé: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️ Aucun changement nécessaire: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erreur lors de la correction de ${filePath}:`, error.message);
    return false;
  }
}

// Corriger tous les endpoints
console.log('🔧 Correction des endpoints avec authentification hardcodée...\n');

let correctedCount = 0;
endpointsToFix.forEach(endpoint => {
  if (fs.existsSync(endpoint)) {
    if (fixEndpoint(endpoint)) {
      correctedCount++;
    }
  } else {
    console.log(`⚠️ Fichier non trouvé: ${endpoint}`);
  }
});

console.log(`\n✅ Correction terminée ! ${correctedCount} endpoints corrigés.`); 