#!/usr/bin/env node

/**
 * Script de nettoyage Phase 1 : Logs excessifs
 * Remplace les console.log par logger conditionnel
 */

const fs = require('fs');
const path = require('path');

// Fichiers prioritaires à nettoyer (par ordre d'importance)
const PRIORITY_FILES = [
  'src/components/chat/ChatFullscreenV2.tsx',
  'src/app/api/chat/llm/route.ts',
  'src/store/useChatStore.ts',
  'src/services/llm/providers/template.ts',
  'src/components/chat/ChatSidebar.tsx',
  'src/components/chat/ChatKebabMenu.tsx',
  'src/hooks/useChatStreaming.ts',
  'src/services/llmService.ts',
  'src/services/chatPollingService.ts',
  'src/services/realtimeService.ts'
];

// Patterns de remplacement
const REPLACEMENTS = [
  {
    pattern: /console\.log\(`\[([^\]]+)\]\s*([^`]+)`,\s*([^)]+)\)/g,
    replacement: 'logger.dev(`[$1] $2`, $3)'
  },
  {
    pattern: /console\.log\(`([^`]+)`\)/g,
    replacement: 'logger.dev(`$1`)'
  },
  {
    pattern: /console\.log\(([^)]+)\)/g,
    replacement: 'logger.dev($1)'
  },
  {
    pattern: /console\.error\(([^)]+)\)/g,
    replacement: 'logger.error($1)'
  },
  {
    pattern: /console\.warn\(([^)]+)\)/g,
    replacement: 'logger.warn($1)'
  }
];

// Import du logger à ajouter
const LOGGER_IMPORT = "import { simpleLogger as logger } from '@/utils/logger';";

function addLoggerImport(content, filePath) {
  // Vérifier si l'import existe déjà
  if (content.includes("import { simpleLogger as logger }")) {
    return content;
  }

  // Ajouter l'import après les autres imports
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
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // Ajouter l'import du logger si nécessaire
    if (content.includes('console.log') || content.includes('console.error') || content.includes('console.warn')) {
      content = addLoggerImport(content, filePath);
    }

    // Appliquer les remplacements
    REPLACEMENTS.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });

    // Vérifier si des changements ont été faits
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Nettoyé: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  Aucun changement: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 DÉBUT NETTOYAGE PHASE 1 : LOGS EXCESSIFS');
  console.log('=' .repeat(50));

  let cleanedCount = 0;
  let totalCount = PRIORITY_FILES.length;

  PRIORITY_FILES.forEach((filePath, index) => {
    console.log(`\n[${index + 1}/${totalCount}] Traitement: ${filePath}`);
    
    if (cleanFile(filePath)) {
      cleanedCount++;
    }
  });

  console.log('\n' + '=' .repeat(50));
  console.log(`🎯 RÉSULTATS:`);
  console.log(`✅ Fichiers nettoyés: ${cleanedCount}/${totalCount}`);
  console.log(`📊 Taux de succès: ${Math.round((cleanedCount / totalCount) * 100)}%`);

  if (cleanedCount > 0) {
    console.log('\n📝 PROCHAINES ÉTAPES:');
    console.log('1. Vérifier que le build fonctionne: npm run build');
    console.log('2. Tester les fonctionnalités critiques');
    console.log('3. Passer à la Phase 2 (Types any)');
  }

  console.log('\n✨ Phase 1 terminée !');
}

if (require.main === module) {
  main();
}

module.exports = { cleanFile, PRIORITY_FILES }; 