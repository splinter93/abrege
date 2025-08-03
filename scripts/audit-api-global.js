const fs = require('fs');
const path = require('path');

// Configuration
const API_DIRS = [
  'src/app/api/v1',
  'src/app/api/v2', 
  'src/app/api/chat'
];

const CRITICAL_ISSUES = [];
const WARNINGS = [];
const GOOD_PRACTICES = [];

// Patterns à rechercher
const PATTERNS = {
  hardcodedUserId: /USER_ID|user_id.*=.*['"][^'"]+['"]/g,
  anyType: /: any/g,
  consoleLog: /console\.log/g,
  consoleError: /console\.error/g,
  missingAuth: /getAuthenticatedClient|auth\.uid\(\)/g,
  missingValidation: /zod|validation/g,
  missingErrorHandling: /catch.*error/g,
  missingTypes: /NextRequest|NextResponse/g,
  missingHeaders: /Content-Type.*application\/json/g,
  missingStatusCodes: /status.*[0-9]{3}/g
};

// Fonctions d'audit
function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const relativePath = filePath.replace(process.cwd() + '/', '');
  
  const issues = [];
  const warnings = [];
  const good = [];
  
  // Vérifications critiques
  if (PATTERNS.hardcodedUserId.test(content)) {
    issues.push('USER_ID hardcodé détecté');
  }
  
  if (content.includes(': any') && !content.includes('// TODO: Fix any type')) {
    issues.push('Types any non corrigés');
  }
  
  if (!PATTERNS.missingAuth.test(content) && content.includes('supabase')) {
    issues.push('Authentification manquante');
  }
  
  if (!PATTERNS.missingValidation.test(content) && content.includes('request.json()')) {
    warnings.push('Validation Zod manquante');
  }
  
  if (!PATTERNS.missingErrorHandling.test(content)) {
    warnings.push('Gestion d\'erreur manquante');
  }
  
  if (!PATTERNS.missingTypes.test(content)) {
    warnings.push('Types Next.js manquants');
  }
  
  if (!PATTERNS.missingHeaders.test(content)) {
    warnings.push('Headers Content-Type manquants');
  }
  
  if (!PATTERNS.missingStatusCodes.test(content)) {
    warnings.push('Codes de statut HTTP manquants');
  }
  
  // Bonnes pratiques
  if (PATTERNS.missingAuth.test(content)) {
    good.push('Authentification présente');
  }
  
  if (content.includes('zod')) {
    good.push('Validation Zod présente');
  }
  
  if (content.includes('catch')) {
    good.push('Gestion d\'erreur présente');
  }
  
  if (content.includes('NextRequest') || content.includes('NextResponse')) {
    good.push('Types Next.js présents');
  }
  
  return {
    file: relativePath,
    issues,
    warnings,
    good,
    hasIssues: issues.length > 0,
    hasWarnings: warnings.length > 0
  };
}

function scanDirectory(dir) {
  const results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results.push(...scanDirectory(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.js')) {
      results.push(auditFile(fullPath));
    }
  }
  
  return results;
}

// Audit principal
console.log('🔍 AUDIT GLOBAL DE L\'API');
console.log('========================\n');

const allResults = [];

for (const apiDir of API_DIRS) {
  console.log(`📁 Audit de ${apiDir}:`);
  const results = scanDirectory(apiDir);
  allResults.push(...results);
  
  for (const result of results) {
    if (result.hasIssues) {
      console.log(`  ❌ ${result.file}`);
      result.issues.forEach(issue => console.log(`    - ${issue}`));
    } else if (result.hasWarnings) {
      console.log(`  ⚠️  ${result.file}`);
      result.warnings.forEach(warning => console.log(`    - ${warning}`));
    } else {
      console.log(`  ✅ ${result.file}`);
    }
  }
  console.log('');
}

// Statistiques globales
const totalFiles = allResults.length;
const filesWithIssues = allResults.filter(r => r.hasIssues).length;
const filesWithWarnings = allResults.filter(r => r.hasWarnings).length;
const cleanFiles = allResults.filter(r => !r.hasIssues && !r.hasWarnings).length;

console.log('📊 STATISTIQUES GLOBALES');
console.log('========================');
console.log(`Total de fichiers: ${totalFiles}`);
console.log(`Fichiers avec problèmes critiques: ${filesWithIssues}`);
console.log(`Fichiers avec avertissements: ${filesWithWarnings}`);
console.log(`Fichiers propres: ${cleanFiles}`);
console.log(`Taux de conformité: ${Math.round((cleanFiles / totalFiles) * 100)}%`);

// Résumé des problèmes
const allIssues = allResults.flatMap(r => r.issues);
const allWarnings = allResults.flatMap(r => r.warnings);

if (allIssues.length > 0) {
  console.log('\n🚨 PROBLÈMES CRITIQUES:');
  const issueCounts = {};
  allIssues.forEach(issue => {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });
  Object.entries(issueCounts).forEach(([issue, count]) => {
    console.log(`  - ${issue}: ${count} occurrence(s)`);
  });
}

if (allWarnings.length > 0) {
  console.log('\n⚠️  AVERTISSEMENTS:');
  const warningCounts = {};
  allWarnings.forEach(warning => {
    warningCounts[warning] = (warningCounts[warning] || 0) + 1;
  });
  Object.entries(warningCounts).forEach(([warning, count]) => {
    console.log(`  - ${warning}: ${count} occurrence(s)`);
  });
}

console.log('\n✅ AUDIT TERMINÉ'); 