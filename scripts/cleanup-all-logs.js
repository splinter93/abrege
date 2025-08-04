#!/usr/bin/env node

/**
 * Script de nettoyage complet des logs
 * Remplace TOUS les console.log par logger conditionnel
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Trouver tous les fichiers TypeScript/React
function findTsFiles(dir) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scan(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

// Patterns de remplacement plus agressifs
const REPLACEMENTS = [
  // console.log avec template literals
  {
    pattern: /console\.log\(`([^`]+)`,\s*([^)]+)\)/g,
    replacement: 'logger.dev(`$1`, $2)'
  },
  // console.log avec template literals simples
  {
    pattern: /console\.log\(`([^`]+)`\)/g,
    replacement: 'logger.dev(`$1`)'
  },
  // console.log avec arguments multiples
  {
    pattern: /console\.log\(([^)]+)\)/g,
    replacement: 'logger.dev($1)'
  },
  // console.error
  {
    pattern: /console\.error\(([^)]+)\)/g,
    replacement: 'logger.error($1)'
  },
  // console.warn
  {
    pattern: /console\.warn\(([^)]+)\)/g,
    replacement: 'logger.warn($1)'
  },
  // console.info
  {
    pattern: /console\.info\(([^)]+)\)/g,
    replacement: 'logger.info($1)'
  }
];

// Import du logger
const LOGGER_IMPORT = "import { simpleLogger as logger } from '@/utils/logger';";

function addLoggerImport(content) {
  // Vérifier si l'import existe déjà
  if (content.includes("import { simpleLogger as logger }")) {
    return content;
  }

  const lines = content.split('\n');
  let insertIndex = 0;

  // Trouver la fin des imports
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith("'use client'")) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      break;
    }
  }

  // Insérer l'import du logger
  lines.splice(insertIndex, 0, LOGGER_IMPORT);
  return lines.join('\n');
}

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Vérifier s'il y a des console.log
    if (!content.includes('console.log') && !content.includes('console.error') && !content.includes('console.warn') && !content.includes('console.info')) {
      return false;
    }

    // Ajouter l'import du logger si nécessaire
    content = addLoggerImport(content);

    // Appliquer les remplacements
    REPLACEMENTS.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });

    // Vérifier si des changements ont été faits
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 NETTOYAGE COMPLET DES LOGS');
  console.log('=' .repeat(50));

  // Trouver tous les fichiers TypeScript
  const files = findTsFiles('./src');
  console.log(`📁 ${files.length} fichiers TypeScript trouvés`);

  let cleanedCount = 0;
  let totalWithLogs = 0;

  files.forEach((filePath, index) => {
    const relativePath = path.relative('.', filePath);
    
    // Compter les console.log avant nettoyage
    const content = fs.readFileSync(filePath, 'utf8');
    const logCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
    
    if (logCount > 0) {
      totalWithLogs++;
      console.log(`\n[${index + 1}/${files.length}] ${relativePath} (${logCount} logs)`);
      
      if (cleanFile(filePath)) {
        cleanedCount++;
        console.log(`✅ Nettoyé`);
      } else {
        console.log(`ℹ️  Aucun changement`);
      }
    }
  });

  console.log('\n' + '=' .repeat(50));
  console.log(`🎯 RÉSULTATS:`);
  console.log(`📁 Fichiers traités: ${files.length}`);
  console.log(`📝 Fichiers avec logs: ${totalWithLogs}`);
  console.log(`✅ Fichiers nettoyés: ${cleanedCount}`);

  // Compter les logs restants
  try {
    const remainingLogs = execSync('grep -r "console\\.log" src --include="*.ts" --include="*.tsx" | wc -l', { encoding: 'utf8' });
    console.log(`📊 Console.log restants: ${remainingLogs.trim()}`);
  } catch (error) {
    console.log('❌ Impossible de compter les logs restants');
  }

  console.log('\n✨ Nettoyage terminé !');
}

if (require.main === module) {
  main();
}

module.exports = { cleanFile, findTsFiles }; 