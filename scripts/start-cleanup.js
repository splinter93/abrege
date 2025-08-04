#!/usr/bin/env node

/**
 * Script principal de nettoyage
 * Lance les différentes phases de nettoyage
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`\n🔄 ${description}...`, 'blue');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} terminé`, 'green');
    return true;
  } catch (error) {
    log(`❌ Erreur lors de ${description}:`, 'red');
    console.error(error.message);
    return false;
  }
}

function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log('⚠️  Attention: Des modifications non commitées détectées', 'yellow');
      log('Recommandation: Commiter ou stasher avant de continuer', 'yellow');
      return false;
    }
    return true;
  } catch (error) {
    log('⚠️  Impossible de vérifier le statut Git', 'yellow');
    return true;
  }
}

function backup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `backup-${timestamp}`;
    
    log(`\n💾 Création du backup: ${backupDir}`, 'blue');
    execSync(`cp -r src ${backupDir}`, { stdio: 'inherit' });
    log(`✅ Backup créé: ${backupDir}`, 'green');
    return true;
  } catch (error) {
    log('❌ Erreur lors de la création du backup:', 'red');
    console.error(error.message);
    return false;
  }
}

function phase1() {
  log('\n🎯 PHASE 1 : NETTOYAGE DES LOGS', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  return runCommand('node scripts/cleanup-phase1-logs.js', 'Nettoyage des logs excessifs');
}

function phase2() {
  log('\n🎯 PHASE 2 : TYPES ANY', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  log('⚠️  Phase 2 nécessite une intervention manuelle', 'yellow');
  log('Fichiers prioritaires à corriger:', 'yellow');
  log('- src/services/supabase.ts (30+ any)', 'yellow');
  log('- src/services/optimizedApi.ts (10+ any)', 'yellow');
  log('- src/services/llm/providers/template.ts (8+ any)', 'yellow');
  
  return true;
}

function phase3() {
  log('\n🎯 PHASE 3 : VARIABLES INUTILISÉES', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  return runCommand('npm run lint -- --fix', 'Correction automatique des variables inutilisées');
}

function phase4() {
  log('\n🎯 PHASE 4 : HOOKS REACT', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  log('⚠️  Phase 4 nécessite une intervention manuelle', 'yellow');
  log('Fichiers à corriger:', 'yellow');
  log('- src/app/(private)/note/[id]/page.tsx', 'yellow');
  log('- src/components/EditorToolbar.tsx', 'yellow');
  log('- src/hooks/useEditorSave.ts', 'yellow');
  
  return true;
}

function validation() {
  log('\n🎯 VALIDATION FINALE', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  const steps = [
    { cmd: 'npm run build', desc: 'Build du projet' },
    { cmd: 'npm run lint', desc: 'Vérification lint' },
    { cmd: 'npm run type-check', desc: 'Vérification des types' }
  ];
  
  let success = true;
  steps.forEach(({ cmd, desc }) => {
    if (!runCommand(cmd, desc)) {
      success = false;
    }
  });
  
  return success;
}

function showResults() {
  log('\n📊 RÉSULTATS DU NETTOYAGE', 'magenta');
  log('=' .repeat(50), 'cyan');
  
  // Compter les console.log restants
  try {
    const grepResult = execSync('grep -r "console\\.log" src --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' });
    const remainingLogs = parseInt(grepResult.trim());
    log(`📝 Console.log restants: ${remainingLogs}`, remainingLogs < 50 ? 'green' : 'yellow');
  } catch (error) {
    log('❌ Impossible de compter les console.log restants', 'red');
  }
  
  // Compter les types any restants
  try {
    const grepResult = execSync('grep -r ": any" src --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' });
    const remainingAny = parseInt(grepResult.trim());
    log(`🔤 Types any restants: ${remainingAny}`, remainingAny < 20 ? 'green' : 'yellow');
  } catch (error) {
    log('❌ Impossible de compter les types any restants', 'red');
  }
  
  log('\n🎯 PROCHAINES ÉTAPES:', 'cyan');
  log('1. Tester les fonctionnalités critiques', 'cyan');
  log('2. Corriger manuellement les types any restants', 'cyan');
  log('3. Optimiser les hooks React', 'cyan');
  log('4. Optimiser les images', 'cyan');
}

function main() {
  log('🧹 DÉBUT DU NETTOYAGE COMPLET', 'bright');
  log('=' .repeat(60), 'cyan');
  
  // Vérifications préliminaires
  if (!checkGitStatus()) {
    log('\n❌ Arrêt du nettoyage - modifications non commitées', 'red');
    return;
  }
  
  // Backup
  if (!backup()) {
    log('\n❌ Arrêt du nettoyage - erreur de backup', 'red');
    return;
  }
  
  // Exécution des phases
  const phases = [
    { name: 'Phase 1', fn: phase1 },
    { name: 'Phase 2', fn: phase2 },
    { name: 'Phase 3', fn: phase3 },
    { name: 'Phase 4', fn: phase4 }
  ];
  
  let allSuccess = true;
  phases.forEach(({ name, fn }) => {
    if (!fn()) {
      log(`\n⚠️  ${name} a rencontré des problèmes`, 'yellow');
      allSuccess = false;
    }
  });
  
  // Validation finale
  if (allSuccess) {
    validation();
  }
  
  // Résultats
  showResults();
  
  log('\n✨ NETTOYAGE TERMINÉ !', 'bright');
}

if (require.main === module) {
  main();
}

module.exports = { main }; 