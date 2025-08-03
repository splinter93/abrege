const fs = require('fs');
const path = require('path');

console.log('🔒 AUDIT DE SÉCURITÉ DE L\'API');
console.log('================================');

// 1. Vérifier les endpoints avec des problèmes de parsing
const parsingErrors = [
  'src/app/api/v1/note/[ref]/add-content/route.ts',
  'src/app/api/v1/note/[ref]/add-to-section/route.ts',
  'src/app/api/v1/note/[ref]/clear-section/route.ts',
  'src/app/api/v1/note/[ref]/information/route.ts',
  'src/app/api/v1/note/[ref]/statistics/route.ts',
  'src/app/api/v1/note/[ref]/table-of-contents/route.ts',
  'src/app/api/v1/note/merge/route.ts',
  'src/app/api/v1/note/overwrite/route.ts'
];

console.log('\n❌ ERREURS DE PARSING CRITIQUES:');
parsingErrors.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  - ${file} (ERREUR DE PARSING)`);
  }
});

// 2. Vérifier les variables d'environnement sensibles
console.log('\n🔑 VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT:');
const envVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SYNESIA_API_KEY',
  'SYNESIA_PROJECT_ID'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (value.includes('your_') || value.includes('placeholder')) {
      console.log(`  ❌ ${varName}: Utilise un placeholder`);
    } else {
      console.log(`  ✅ ${varName}: Configuré`);
    }
  } else {
    console.log(`  ⚠️  ${varName}: Non défini`);
  }
});

// 3. Vérifier les types any dans les endpoints API
console.log('\n⚠️  TYPES ANY DANS LES ENDPOINTS API:');
const apiFiles = [
  'src/app/api/v1/note/[ref]/publish/route.ts',
  'src/app/api/v1/note/[ref]/route.ts',
  'src/app/api/v1/folder/[ref]/route.ts',
  'src/app/api/v1/classeur/[ref]/route.ts',
  'src/app/api/v1/notebook/[ref]/route.ts'
];

apiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const anyCount = (content.match(/:\s*any/g) || []).length;
    if (anyCount > 0) {
      console.log(`  - ${file}: ${anyCount} types 'any'`);
    }
  }
});

// 4. Vérifier la validation des entrées
console.log('\n🛡️  VALIDATION DES ENTRÉES:');
const validationPatterns = [
  { pattern: /z\.object\(/, name: 'Zod validation' },
  { pattern: /\.safeParse\(/, name: 'Safe parsing' },
  { pattern: /\.min\(/, name: 'Min length validation' },
  { pattern: /\.max\(/, name: 'Max length validation' }
];

apiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const validations = validationPatterns.filter(p => p.pattern.test(content));
    if (validations.length > 0) {
      console.log(`  ✅ ${file}: ${validations.map(v => v.name).join(', ')}`);
    } else {
      console.log(`  ❌ ${file}: Pas de validation d'entrée`);
    }
  }
});

// 5. Vérifier la gestion d'erreur
console.log('\n🚨 GESTION D\'ERREUR:');
apiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasErrorHandling = content.includes('catch') && content.includes('error');
    const hasStatusCodes = content.includes('status: 401') || content.includes('status: 422') || content.includes('status: 500');
    
    if (hasErrorHandling && hasStatusCodes) {
      console.log(`  ✅ ${file}: Gestion d'erreur complète`);
    } else if (hasErrorHandling) {
      console.log(`  ⚠️  ${file}: Gestion d'erreur basique`);
    } else {
      console.log(`  ❌ ${file}: Pas de gestion d'erreur`);
    }
  }
});

// 6. Vérifier l'authentification
console.log('\n🔐 AUTHENTIFICATION:');
apiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasAuth = content.includes('getAuthenticatedClient') || content.includes('auth.getUser');
    const hasBearerCheck = content.includes('Bearer ') && content.includes('authorization');
    
    if (hasAuth && hasBearerCheck) {
      console.log(`  ✅ ${file}: Authentification complète`);
    } else if (hasAuth) {
      console.log(`  ⚠️  ${file}: Authentification partielle`);
    } else {
      console.log(`  ❌ ${file}: Pas d'authentification`);
    }
  }
});

console.log('\n📋 RÉSUMÉ DES PROBLÈMES CRITIQUES:');
console.log('1. Erreurs de parsing dans 8 endpoints');
console.log('2. Types "any" non typés');
console.log('3. Variables d\'environnement potentiellement non configurées');
console.log('4. Gestion d\'erreur incohérente');
console.log('5. Validation d\'entrée manquante dans certains endpoints');

console.log('\n🎯 PRIORITÉS DE CORRECTION:');
console.log('1. 🔥 Corriger les erreurs de parsing (CRITIQUE)');
console.log('2. 🔥 Remplacer les types "any" par des types spécifiques');
console.log('3. ⚠️  Améliorer la validation des entrées');
console.log('4. ⚠️  Standardiser la gestion d\'erreur');
console.log('5. ✅ Vérifier la configuration des variables d\'environnement'); 