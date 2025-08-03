const fs = require('fs');
const path = require('path');

// Configuration
const API_V2_DIR = 'src/app/api/v2';

// Patterns spécifiques à l'API V2
const V2_PATTERNS = {
  // Authentification V2
  v2Auth: /getAuthenticatedUser|checkUserPermission/g,
  
  // Validation Zod V2
  v2Validation: /validatePayload|createValidationErrorResponse|V2ValidationSchemas/g,
  
  // Logging V2
  v2Logging: /logApi.*v2_|context.*API_V2/g,
  
  // Resource Resolver V2
  v2ResourceResolver: /V2ResourceResolver|resolveRef/g,
  
  // Headers Content-Type
  missingContentType: /NextResponse\.json\([^,]+\)(?!.*headers)/g,
  
  // Gestion d'erreur
  missingErrorHandling: /catch \(err: unknown\)/g,
  
  // Types Next.js
  missingNextJsTypes: /NextRequest|NextResponse/g
};

// Fonction d'audit pour un fichier V2
function auditV2File(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  const good = [];
  
  // Vérifier l'authentification V2
  const hasV2Auth = V2_PATTERNS.v2Auth.test(content);
  if (hasV2Auth) {
    good.push('Authentification V2 présente');
  } else {
    issues.push('Authentification V2 manquante');
  }
  
  // Vérifier la validation Zod V2
  const hasV2Validation = V2_PATTERNS.v2Validation.test(content);
  if (hasV2Validation) {
    good.push('Validation Zod V2 présente');
  } else {
    issues.push('Validation Zod V2 manquante');
  }
  
  // Vérifier le logging V2
  const hasV2Logging = V2_PATTERNS.v2Logging.test(content);
  if (hasV2Logging) {
    good.push('Logging V2 présent');
  } else {
    issues.push('Logging V2 manquant');
  }
  
  // Vérifier le Resource Resolver V2
  const hasV2ResourceResolver = V2_PATTERNS.v2ResourceResolver.test(content);
  if (hasV2ResourceResolver) {
    good.push('Resource Resolver V2 présent');
  } else {
    issues.push('Resource Resolver V2 manquant');
  }
  
  // Vérifier les headers Content-Type
  const hasContentType = content.includes('headers: { "Content-Type": "application/json" }');
  if (hasContentType) {
    good.push('Headers Content-Type présents');
  } else {
    issues.push('Headers Content-Type manquants');
  }
  
  // Vérifier la gestion d'erreur
  const hasErrorHandling = V2_PATTERNS.missingErrorHandling.test(content);
  if (hasErrorHandling) {
    good.push('Gestion d\'erreur présente');
  } else {
    issues.push('Gestion d\'erreur manquante');
  }
  
  // Vérifier les types Next.js
  const hasNextJsTypes = V2_PATTERNS.missingNextJsTypes.test(content);
  if (hasNextJsTypes) {
    good.push('Types Next.js présents');
  } else {
    issues.push('Types Next.js manquants');
  }
  
  return { issues, good };
}

// Fonction de scan récursif
function scanV2Directory(dir) {
  const results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results.push(...scanV2Directory(fullPath));
    } else if (item.endsWith('.ts') && item.includes('route')) {
      const { issues, good } = auditV2File(fullPath);
      
      if (issues.length > 0 || good.length > 0) {
        console.log(`  ${issues.length > 0 ? '❌' : '✅'} ${fullPath}`);
        if (issues.length > 0) {
          issues.forEach(issue => console.log(`    - ${issue}`));
        }
        if (good.length > 0) {
          good.forEach(good => console.log(`    ✅ ${good}`));
        }
      }
      
      results.push({ path: fullPath, issues, good });
    }
  }
  
  return results;
}

// Exécution
console.log('🔍 AUDIT SPÉCIFIQUE API V2');
console.log('==========================\n');

const auditResults = scanV2Directory(API_V2_DIR);

// Statistiques
const totalFiles = auditResults.length;
const filesWithIssues = auditResults.filter(r => r.issues.length > 0).length;
const filesWithGood = auditResults.filter(r => r.good.length > 0).length;

const allIssues = auditResults.flatMap(r => r.issues);
const allGood = auditResults.flatMap(r => r.good);

console.log('\n📊 STATISTIQUES API V2');
console.log('========================');
console.log(`Total de fichiers: ${totalFiles}`);
console.log(`Fichiers avec problèmes: ${filesWithIssues}`);
console.log(`Fichiers avec bonnes pratiques: ${filesWithGood}`);

if (allIssues.length > 0) {
  console.log('\n🚨 PROBLÈMES DÉTECTÉS:');
  const issueCounts = {};
  allIssues.forEach(issue => {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });
  Object.entries(issueCounts).forEach(([issue, count]) => {
    console.log(`  - ${issue}: ${count} occurrence(s)`);
  });
}

if (allGood.length > 0) {
  console.log('\n✅ BONNES PRATIQUES DÉTECTÉES:');
  const goodCounts = {};
  allGood.forEach(good => {
    goodCounts[good] = (goodCounts[good] || 0) + 1;
  });
  Object.entries(goodCounts).forEach(([good, count]) => {
    console.log(`  - ${good}: ${count} occurrence(s)`);
  });
}

console.log('\n✅ AUDIT V2 TERMINÉ'); 