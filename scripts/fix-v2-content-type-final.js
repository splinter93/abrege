const fs = require('fs');
const path = require('path');

const API_V2_DIR = 'src/app/api/v2';

// Liste des fichiers à corriger avec leurs patterns spécifiques
const FILES_TO_FIX = [
  {
    file: 'src/app/api/v2/note/[ref]/content/route.ts',
    patterns: [
      { old: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401 }\n    );', new: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status }\n    );', new: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500 }\n    );', new: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour accéder à cette note\' },\n      { status: 403 }\n    );', new: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour accéder à cette note\' },\n      { status: 403, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404 }\n      );', new: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404, headers: { "Content-Type": "application/json" } }\n      );' },
      { old: 'return NextResponse.json({\n      success: true,\n      message: \'Contenu récupéré avec succès\',\n      content: note.markdown_content\n    });', new: 'return NextResponse.json({\n      success: true,\n      message: \'Contenu récupéré avec succès\',\n      content: note.markdown_content\n    }, { headers: { "Content-Type": "application/json" } });' },
      { old: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500 }\n    );', new: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500, headers: { "Content-Type": "application/json" } }\n    );' }
    ]
  },
  {
    file: 'src/app/api/v2/note/[ref]/delete/route.ts',
    patterns: [
      { old: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401 }\n    );', new: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status }\n    );', new: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500 }\n    );', new: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour supprimer cette note\' },\n      { status: 403 }\n    );', new: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour supprimer cette note\' },\n      { status: 403, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404 }\n      );', new: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404, headers: { "Content-Type": "application/json" } }\n      );' },
      { old: 'return NextResponse.json(\n        { error: \'Erreur lors de la suppression\' },\n        { status: 500 }\n      );', new: 'return NextResponse.json(\n        { error: \'Erreur lors de la suppression\' },\n        { status: 500, headers: { "Content-Type": "application/json" } }\n      );' },
      { old: 'return NextResponse.json({\n      success: true,\n      message: \'Note supprimée avec succès\',\n      noteId\n    });', new: 'return NextResponse.json({\n      success: true,\n      message: \'Note supprimée avec succès\',\n      noteId\n    }, { headers: { "Content-Type": "application/json" } });' },
      { old: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500 }\n    );', new: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500, headers: { "Content-Type": "application/json" } }\n    );' }
    ]
  },
  {
    file: 'src/app/api/v2/note/[ref]/merge/route.ts',
    patterns: [
      { old: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401 }\n    );', new: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status }\n    );', new: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }\n    );' }
    ]
  },
  {
    file: 'src/app/api/v2/note/[ref]/move/route.ts',
    patterns: [
      { old: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401 }\n    );', new: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status }\n    );', new: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500 }\n    );', new: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour déplacer cette note\' },\n      { status: 403 }\n    );', new: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour déplacer cette note\' },\n      { status: 403, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404 }\n      );', new: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404, headers: { "Content-Type": "application/json" } }\n      );' },
      { old: 'return NextResponse.json(\n        { error: \'Erreur lors du déplacement\' },\n        { status: 500 }\n      );', new: 'return NextResponse.json(\n        { error: \'Erreur lors du déplacement\' },\n        { status: 500, headers: { "Content-Type": "application/json" } }\n      );' },
      { old: 'return NextResponse.json({\n      success: true,\n      message: \'Note déplacée avec succès\',\n      note: updatedNote\n    });', new: 'return NextResponse.json({\n      success: true,\n      message: \'Note déplacée avec succès\',\n      note: updatedNote\n    }, { headers: { "Content-Type": "application/json" } });' },
      { old: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500 }\n    );', new: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500, headers: { "Content-Type": "application/json" } }\n    );' }
    ]
  },
  {
    file: 'src/app/api/v2/note/[ref]/publish/route.ts',
    patterns: [
      { old: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401 }\n    );', new: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status }\n    );', new: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500 }\n    );', new: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour publier cette note\' },\n      { status: 403 }\n    );', new: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour publier cette note\' },\n      { status: 403, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404 }\n      );', new: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404, headers: { "Content-Type": "application/json" } }\n      );' },
      { old: 'return NextResponse.json(\n        { error: \'Erreur lors de la publication\' },\n        { status: 500 }\n      );', new: 'return NextResponse.json(\n        { error: \'Erreur lors de la publication\' },\n        { status: 500, headers: { "Content-Type": "application/json" } }\n      );' },
      { old: 'return NextResponse.json({\n      success: true,\n      message: \'Note publiée avec succès\',\n      note: updatedNote\n    });', new: 'return NextResponse.json({\n      success: true,\n      message: \'Note publiée avec succès\',\n      note: updatedNote\n    }, { headers: { "Content-Type": "application/json" } });' },
      { old: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500 }\n    );', new: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500, headers: { "Content-Type": "application/json" } }\n    );' }
    ]
  },
  {
    file: 'src/app/api/v2/note/[ref]/update/route.ts',
    patterns: [
      { old: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401 }\n    );', new: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status }\n    );', new: 'return NextResponse.json(\n      { error: resolveResult.error },\n      { status: resolveResult.status, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500 }\n    );', new: 'return NextResponse.json(\n      { error: permissionResult.error },\n      { status: permissionResult.status || 500, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour modifier cette note\' },\n      { status: 403 }\n    );', new: 'return NextResponse.json(\n      { error: \'Permissions insuffisantes pour modifier cette note\' },\n      { status: 403, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404 }\n      );', new: 'return NextResponse.json(\n        { error: \'Note non trouvée\' },\n        { status: 404, headers: { "Content-Type": "application/json" } }\n      );' },
      { old: 'return NextResponse.json(\n        { error: \'Erreur lors de la mise à jour\' },\n        { status: 500 }\n      );', new: 'return NextResponse.json(\n        { error: \'Erreur lors de la mise à jour\' },\n        { status: 500, headers: { "Content-Type": "application/json" } }\n      );' },
      { old: 'return NextResponse.json({\n      success: true,\n      message: \'Note mise à jour avec succès\',\n      note: updatedNote\n    });', new: 'return NextResponse.json({\n      success: true,\n      message: \'Note mise à jour avec succès\',\n      note: updatedNote\n    }, { headers: { "Content-Type": "application/json" } });' },
      { old: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500 }\n    );', new: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500, headers: { "Content-Type": "application/json" } }\n    );' }
    ]
  },
  {
    file: 'src/app/api/v2/note/create/route.ts',
    patterns: [
      { old: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401 }\n    );', new: 'return NextResponse.json(\n      { error: authResult.error },\n      { status: authResult.status || 401, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json(\n      { error: \'Erreur lors de la création\' },\n      { status: 500 }\n    );', new: 'return NextResponse.json(\n      { error: \'Erreur lors de la création\' },\n      { status: 500, headers: { "Content-Type": "application/json" } }\n    );' },
      { old: 'return NextResponse.json({\n      success: true,\n      message: \'Note créée avec succès\',\n      note: newNote\n    });', new: 'return NextResponse.json({\n      success: true,\n      message: \'Note créée avec succès\',\n      note: newNote\n    }, { headers: { "Content-Type": "application/json" } });' },
      { old: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500 }\n    );', new: 'return NextResponse.json(\n      { error: \'Erreur serveur\' },\n      { status: 500, headers: { "Content-Type": "application/json" } }\n    );' }
    ]
  }
];

function fixFile(filePath, patterns) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Fichier non trouvé: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  patterns.forEach(pattern => {
    if (content.includes(pattern.old)) {
      content = content.replace(pattern.old, pattern.new);
      modified = true;
      console.log(`✅ Pattern corrigé dans ${filePath}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fichier corrigé: ${filePath}`);
    return true;
  } else {
    console.log(`⚠️  Aucun pattern trouvé dans ${filePath}`);
    return false;
  }
}

console.log('🔧 CORRECTION FINALE HEADERS CONTENT-TYPE API V2');
console.log('================================================');

let fixedCount = 0;
FILES_TO_FIX.forEach(({ file, patterns }) => {
  if (fixFile(file, patterns)) {
    fixedCount++;
  }
});

console.log(`\n✅ CORRECTION TERMINÉE`);
console.log(`📊 Fichiers corrigés: ${fixedCount}/${FILES_TO_FIX.length}`); 