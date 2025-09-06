#!/usr/bin/env node

/**
 * Audit de qualité du code TypeScript
 * Vérifie la structure, les types, et élimine les 'any'
 */

const fs = require('fs');
const path = require('path');

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function analyzeTypeScriptFile(filePath, description) {
  log(`\n🔍 Analyse: ${description}`, 'blue');
  log(`📁 Fichier: ${filePath}`, 'blue');
  
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    log(`❌ Fichier manquant`, 'red');
    return { score: 0, issues: ['Fichier manquant'] };
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const issues = [];
  let score = 100;

  // 1. Vérifier les 'any' explicites
  const anyMatches = content.match(/\bany\b/g);
  if (anyMatches) {
    const anyCount = anyMatches.length;
    issues.push(`${anyCount} occurrence(s) de 'any' explicite`);
    score -= anyCount * 10;
  }

  // 2. Vérifier les types explicites
  const hasInterfaces = content.includes('interface ');
  const hasTypes = content.includes('type ');
  const hasEnums = content.includes('enum ');
  const hasGenerics = content.includes('<');

  if (!hasInterfaces && !hasTypes) {
    issues.push('Aucun type personnalisé défini');
    score -= 20;
  }

  // 3. Vérifier les imports/exports
  const hasImports = content.includes('import ');
  const hasExports = content.includes('export ');
  const hasDefaultExport = content.includes('export default');

  if (!hasImports) {
    issues.push('Aucun import détecté');
    score -= 10;
  }
  if (!hasExports) {
    issues.push('Aucun export détecté');
    score -= 10;
  }

  // 4. Vérifier la documentation JSDoc
  const hasJSDoc = content.includes('/**');
  const hasComments = content.includes('//');
  const commentRatio = (content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || []).length / content.split('\n').length;

  if (!hasJSDoc) {
    issues.push('Aucune documentation JSDoc');
    score -= 15;
  }

  // 5. Vérifier la gestion d'erreurs
  const hasTryCatch = content.includes('try {') || content.includes('try{');
  const hasErrorHandling = content.includes('catch') || content.includes('throw');
  const hasLogging = content.includes('logger') || content.includes('console.');

  if (!hasTryCatch && !hasErrorHandling) {
    issues.push('Gestion d\'erreurs manquante');
    score -= 15;
  }

  // 6. Vérifier les bonnes pratiques
  const hasAsyncAwait = content.includes('async ') || content.includes('await ');
  const hasConstLet = content.includes('const ') || content.includes('let ');
  const hasArrowFunctions = content.includes('=>');
  const hasDestructuring = content.includes('{') && content.includes('}') && content.includes('=');

  // 7. Vérifier la complexité cyclomatique (approximation)
  const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
  const ifCount = (content.match(/\bif\s*\(/g) || []).length;
  const forCount = (content.match(/\bfor\s*\(/g) || []).length;
  const whileCount = (content.match(/\bwhile\s*\(/g) || []).length;
  const switchCount = (content.match(/\bswitch\s*\(/g) || []).length;
  
  const complexity = ifCount + forCount + whileCount + switchCount;
  if (complexity > 20) {
    issues.push(`Complexité élevée: ${complexity} conditions/loops`);
    score -= Math.min(20, complexity - 20);
  }

  // 8. Vérifier la cohérence des noms
  const hasCamelCase = /[a-z][A-Z]/.test(content);
  const hasPascalCase = /^[A-Z][a-z]/.test(content);
  const hasSnakeCase = /[a-z]_[a-z]/.test(content);

  // 9. Vérifier les patterns TypeScript avancés
  const hasOptionalChaining = content.includes('?.');
  const hasNullishCoalescing = content.includes('??');
  const hasTemplateLiterals = content.includes('`');
  const hasSpreadOperator = content.includes('...');

  // 10. Vérifier la longueur des lignes
  const lines = content.split('\n');
  const longLines = lines.filter(line => line.length > 120).length;
  if (longLines > 0) {
    issues.push(`${longLines} ligne(s) trop longue(s) (>120 caractères)`);
    score -= longLines * 2;
  }

  // 11. Vérifier la longueur des fonctions
  const functions = content.split(/(?:function|const\s+\w+\s*=\s*(?:async\s+)?\()/);
  const longFunctions = functions.filter(func => func.split('\n').length > 50).length;
  if (longFunctions > 0) {
    issues.push(`${longFunctions} fonction(s) trop longue(s) (>50 lignes)`);
    score -= longFunctions * 5;
  }

  // Afficher les résultats
  const status = score >= 90 ? '✅' : score >= 70 ? '⚠️' : '❌';
  const color = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
  
  log(`${status} Score: ${score}/100`, color);
  
  if (issues.length > 0) {
    log('📋 Problèmes détectés:', 'yellow');
    issues.forEach(issue => log(`  - ${issue}`, 'yellow'));
  } else {
    log('✅ Aucun problème détecté', 'green');
  }

  // Détails positifs
  const positives = [];
  if (hasInterfaces) positives.push('Interfaces définies');
  if (hasTypes) positives.push('Types personnalisés');
  if (hasJSDoc) positives.push('Documentation JSDoc');
  if (hasTryCatch) positives.push('Gestion d\'erreurs');
  if (hasAsyncAwait) positives.push('Async/await');
  if (hasOptionalChaining) positives.push('Optional chaining');
  if (hasNullishCoalescing) positives.push('Nullish coalescing');
  if (hasTemplateLiterals) positives.push('Template literals');
  if (hasDestructuring) positives.push('Destructuring');
  if (hasArrowFunctions) positives.push('Arrow functions');

  if (positives.length > 0) {
    log('✅ Bonnes pratiques:', 'green');
    positives.forEach(positive => log(`  + ${positive}`, 'green'));
  }

  return { score, issues, positives };
}

async function auditCodeQuality() {
  log(`${colors.bold}🔍 AUDIT QUALITÉ CODE TYPESCRIPT${colors.reset}`, 'blue');
  log('===============================================', 'blue');

  const files = [
    {
      path: 'src/types/specializedAgents.ts',
      description: 'Types et interfaces'
    },
    {
      path: 'src/services/specializedAgents/SpecializedAgentManager.ts',
      description: 'Manager principal'
    },
    {
      path: 'src/services/specializedAgents/schemaValidator.ts',
      description: 'Validateur de schémas'
    },
    {
      path: 'src/services/specializedAgents/multimodalHandler.ts',
      description: 'Gestionnaire multimodale'
    },
    {
      path: 'src/app/api/v2/agents/[agentId]/route.ts',
      description: 'Route API agent'
    },
    {
      path: 'src/app/api/v2/openapi-schema/route.ts',
      description: 'Route OpenAPI'
    },
    {
      path: 'src/app/api/ui/agents/specialized/route.ts',
      description: 'Route UI agents'
    },
    {
      path: 'src/hooks/useSpecializedAgents.ts',
      description: 'Hook React'
    },
    {
      path: 'src/components/SpecializedAgentsTest.tsx',
      description: 'Composant React'
    }
  ];

  const results = [];
  let totalScore = 0;
  let totalFiles = 0;

  for (const file of files) {
    const result = analyzeTypeScriptFile(file.path, file.description);
    results.push({ ...file, ...result });
    totalScore += result.score;
    totalFiles++;
  }

  // Résumé global
  log('\n📊 RÉSUMÉ GLOBAL:', 'bold');
  log('=================', 'bold');
  
  const averageScore = Math.round(totalScore / totalFiles);
  const status = averageScore >= 90 ? '✅ EXCELLENT' : averageScore >= 70 ? '⚠️ BON' : '❌ À AMÉLIORER';
  const color = averageScore >= 90 ? 'green' : averageScore >= 70 ? 'yellow' : 'red';
  
  log(`Score moyen: ${averageScore}/100`, color);
  log(`Status: ${status}`, color);

  // Détails par fichier
  log('\n📋 DÉTAILS PAR FICHIER:', 'bold');
  results.forEach(result => {
    const status = result.score >= 90 ? '✅' : result.score >= 70 ? '⚠️' : '❌';
    const color = result.score >= 90 ? 'green' : result.score >= 70 ? 'yellow' : 'red';
    log(`${status} ${result.description}: ${result.score}/100`, color);
  });

  // Recommandations
  log('\n💡 RECOMMANDATIONS:', 'bold');
  
  const allIssues = results.flatMap(r => r.issues);
  const commonIssues = allIssues.reduce((acc, issue) => {
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {});

  Object.entries(commonIssues)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([issue, count]) => {
      log(`  - ${issue} (${count} fichier(s))`, 'yellow');
    });

  // Conclusion
  if (averageScore >= 90) {
    log('\n🎉 CODE EXCELLENT !', 'green');
    log('✅ Respecte les bonnes pratiques TypeScript', 'green');
    log('✅ Structure claire et maintenable', 'green');
    log('✅ Prêt pour la production', 'green');
  } else if (averageScore >= 70) {
    log('\n⚠️ CODE BON, QUELQUES AMÉLIORATIONS POSSIBLES', 'yellow');
    log('✅ Base solide', 'green');
    log('⚠️ Quelques optimisations recommandées', 'yellow');
  } else {
    log('\n❌ CODE NÉCESSITE DES AMÉLIORATIONS', 'red');
    log('❌ Plusieurs problèmes à corriger', 'red');
  }

  return averageScore;
}

// Exécuter l'audit
auditCodeQuality().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
