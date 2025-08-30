const fs = require('fs');
const path = require('path');

console.log('🔧 Correction des types any dans les API...');

const apiFiles = [
  'src/app/api/ui/note/[ref]/route.ts',
  'src/app/api/ui/folder/[ref]/route.ts',
  'src/app/api/ui/classeur/[ref]/route.ts',
  'src/app/api/ui/notebook/[ref]/route.ts',
  'src/app/api/ui/note/[ref]/publish/route.ts'
];

apiFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = false;
  
  // 1. Ajouter l'import des types API
  if (!content.includes('import type { ApiContext')) {
    const importIndex = content.indexOf('import { resolveNoteRef }');
    if (importIndex !== -1) {
      const beforeImport = content.substring(0, importIndex);
      const afterImport = content.substring(importIndex);
      content = beforeImport + 'import type { ApiContext } from \'@/types/api\';\n' + afterImport;
      fixed = true;
    }
  }
  
  // 2. Remplacer { params }: any par { params }: ApiContext
  if (content.includes('{ params }: any')) {
    content = content.replace(/\{ params \}: any/g, '{ params }: ApiContext');
    fixed = true;
  }
  
  // 3. Remplacer err: any par err: unknown
  if (content.includes('err: any')) {
    content = content.replace(/err: any/g, 'err: unknown');
    fixed = true;
  }
  
  // 4. Ajouter le cast d'erreur
  if (content.includes('err: unknown') && !content.includes('const error = err as Error')) {
    content = content.replace(
      /} catch \(err: unknown\) \{/g,
      '} catch (err: unknown) {\n    const error = err as Error;'
    );
    content = content.replace(/err\.message/g, 'error.message');
    fixed = true;
  }
  
  // 5. Typer les body JSON
  if (content.includes('await req.json()') && !content.includes('as ')) {
    // Ajouter des types spécifiques selon le contexte
    if (filePath.includes('note') && filePath.includes('publish')) {
      content = content.replace(
        /const body = await req\.json\(\);/g,
        'const body = await req.json() as NotePublishData;'
      );
      if (!content.includes('import type { NotePublishData }')) {
        content = content.replace(
          /import type \{ ApiContext \}/g,
          'import type { ApiContext, NotePublishData }'
        );
      }
    }
    fixed = true;
  }
  
  if (fixed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corrigé: ${filePath}`);
  } else {
    console.log(`⚠️  Aucune correction nécessaire: ${filePath}`);
  }
});

console.log('🎉 Correction des types terminée !'); 