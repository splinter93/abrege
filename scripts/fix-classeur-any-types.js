const fs = require('fs');

console.log('🔧 Correction des types any dans les endpoints classeurs...');

const filesToFix = [
  'src/app/api/v1/classeur/[ref]/dossiers/route.ts',
  'src/app/api/v1/classeur/[ref]/meta/route.ts',
  'src/app/api/v1/classeur/[ref]/tree/route.ts',
  'src/app/api/v1/classeur/[ref]/full-tree/route.ts',
  'src/app/api/v1/classeur/reorder/route.ts'
];

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = false;
  
  // 1. Corriger { params }: any
  if (content.includes('{ params }: any')) {
    content = content.replace(/{ params }: any/g, '{ params }: { params: Promise<{ ref: string }> }');
    fixed = true;
  }
  
  // 2. Corriger err: any
  if (content.includes('err: any')) {
    content = content.replace(/err: any/g, 'err: unknown');
    content = content.replace(/} catch \(err: unknown\) {/g, '} catch (err: unknown) {\n    const error = err as Error;');
    fixed = true;
  }
  
  // 3. Corriger error: any
  if (content.includes('error: any')) {
    content = content.replace(/error: any/g, 'error: unknown');
    fixed = true;
  }
  
  // 4. Corriger les types any dans les objets
  if (content.includes(': any')) {
    content = content.replace(/:\s*any\s*=/g, ': Record<string, unknown> =');
    content = content.replace(/:\s*any\s*}/g, ': Record<string, unknown> }');
    fixed = true;
  }
  
  if (fixed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corrigé: ${filePath}`);
  } else {
    console.log(`⚠️  Aucune correction nécessaire: ${filePath}`);
  }
});

console.log('🎉 Correction des types any terminée !'); 