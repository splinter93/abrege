const fs = require('fs');

console.log('🔍 AUDIT DES ENDPOINTS CLASSEURS...');

const classeurEndpoints = [
  'src/app/api/ui/classeur/create/route.ts',
  'src/app/api/ui/classeur/[ref]/route.ts',
  'src/app/api/ui/classeur/[ref]/dossiers/route.ts',
  'src/app/api/ui/classeur/[ref]/meta/route.ts',
  'src/app/api/ui/classeur/[ref]/tree/route.ts',
  'src/app/api/ui/classeur/[ref]/full-tree/route.ts',
  'src/app/api/ui/classeur/reorder/route.ts'
];

const auditResults = [];

classeurEndpoints.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Fichier manquant: ${filePath}`);
    auditResults.push({ file: filePath, status: 'MISSING', issues: ['Fichier non trouvé'] });
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // 1. Vérifier l'authentification
  if (!content.includes('getAuthenticatedClient')) {
    issues.push('❌ Pas de fonction getAuthenticatedClient');
  }
  
  if (!content.includes('Bearer ')) {
    issues.push('❌ Pas de vérification Bearer token');
  }
  
  // 2. Vérifier la gestion d'erreur
  if (!content.includes('Token invalide ou expiré')) {
    issues.push('❌ Pas de gestion erreur authentification');
  }
  
  // 3. Vérifier les types
  if (content.includes('any') && !content.includes('// TODO: any')) {
    issues.push('⚠️ Types any détectés');
  }
  
  // 4. Vérifier la validation
  if (!content.includes('z.object') && !content.includes('zod')) {
    issues.push('⚠️ Pas de validation Zod');
  }
  
  // 5. Vérifier les imports
  if (!content.includes('createClient')) {
    issues.push('❌ Import createClient manquant');
  }
  
  if (!content.includes('NextRequest')) {
    issues.push('❌ Import NextRequest manquant');
  }
  
  // 6. Vérifier la sécurité RLS
  if (content.includes('user_id') && content.includes('userId')) {
    issues.push('✅ Vérification propriétaire détectée');
  } else if (content.includes('user_id')) {
    issues.push('⚠️ Vérification propriétaire partielle');
  }
  
  const status = issues.length === 0 ? '✅ OK' : 
                 issues.some(i => i.startsWith('❌')) ? '❌ CRITIQUE' : '⚠️ WARNING';
  
  auditResults.push({ file: filePath, status, issues });
  
  console.log(`${status} ${filePath}`);
  if (issues.length > 0) {
    issues.forEach(issue => console.log(`  ${issue}`));
  }
});

console.log('\n📊 RÉSUMÉ DE L\'AUDIT:');
const critical = auditResults.filter(r => r.status === '❌ CRITIQUE').length;
const warnings = auditResults.filter(r => r.status === '⚠️ WARNING').length;
const ok = auditResults.filter(r => r.status === '✅ OK').length;

console.log(`✅ OK: ${ok}/${auditResults.length}`);
console.log(`⚠️ WARNINGS: ${warnings}`);
console.log(`❌ CRITIQUES: ${critical}`);

if (critical > 0) {
  console.log('\n🚨 ENDPOINTS CRITIQUES À CORRIGER:');
  auditResults.filter(r => r.status === '❌ CRITIQUE').forEach(r => {
    console.log(`  ${r.file}`);
    r.issues.forEach(issue => console.log(`    ${issue}`));
  });
}

if (warnings > 0) {
  console.log('\n⚠️ ENDPOINTS AVEC WARNINGS:');
  auditResults.filter(r => r.status === '⚠️ WARNING').forEach(r => {
    console.log(`  ${r.file}`);
    r.issues.forEach(issue => console.log(`    ${issue}`));
  });
}

console.log('\n�� AUDIT TERMINÉ !'); 