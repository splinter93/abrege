const fs = require('fs');

console.log('🔧 Correction des erreurs de syntaxe...');

const filesToFix = [
  'src/app/api/v1/note/[ref]/information/route.ts',
  'src/app/api/v1/note/merge/route.ts'
];

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = false;
  
  // 1. Supprimer les accolades en trop à la fin
  if (content.match(/}\s*}\s*$/)) {
    content = content.replace(/}\s*}\s*$/, '}');
    fixed = true;
  }
  
  // 2. Corriger les accolades en trop dans les catch
  if (content.includes('} catch (err: any) {')) {
    content = content.replace(/}\s*}\s*$/g, '}');
    fixed = true;
  }
  
  if (fixed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corrigé: ${filePath}`);
  } else {
    console.log(`⚠️  Aucune correction nécessaire: ${filePath}`);
  }
});

console.log('🎉 Correction des erreurs de syntaxe terminée !'); 