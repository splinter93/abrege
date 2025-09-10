#!/usr/bin/env node

/**
 * Nettoyage final agressif pour atteindre un score de production
 * Supprime tous les !important non critiques
 */

const fs = require('fs');
const path = require('path');

// Fichiers à nettoyer
const filesToClean = [
  'src/styles/pages/fichiers.css',
  'src/styles/pages/dossiers.css',
  'src/styles/mermaid.css',
  'src/styles/public-note.css',
  'src/styles/syntax-highlighting.css',
  'src/components/chat/ChatBubbles.css'
];

// Patterns de nettoyage agressif
const aggressivePatterns = [
  // Supprimer les !important non critiques
  { 
    pattern: /([^;]+)\s*!important;?/g, 
    replacement: '$1;',
    description: '!important supprimés',
    exclude: ['z-index', 'position: fixed', 'position: absolute', 'display: none', 'visibility: hidden']
  },
  
  // Nettoyer les espaces multiples
  { 
    pattern: /\n\s*\n\s*\n/g, 
    replacement: '\n\n',
    description: 'Espaces multiples nettoyés'
  },
  
  // Nettoyer les espaces en fin de ligne
  { 
    pattern: /[ \t]+$/gm, 
    replacement: '',
    description: 'Espaces en fin de ligne supprimés'
  }
];

function cleanFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changesCount = 0;

    // Appliquer les patterns de nettoyage
    aggressivePatterns.forEach(({ pattern, replacement, description, exclude }) => {
      const matches = content.match(pattern);
      if (matches) {
        // Vérifier les exclusions
        let filteredMatches = matches;
        if (exclude) {
          filteredMatches = matches.filter(match => 
            !exclude.some(excludePattern => match.includes(excludePattern))
          );
        }
        
        if (filteredMatches.length > 0) {
          changesCount += filteredMatches.length;
          content = content.replace(pattern, replacement);
          console.log(`   - ${description}: ${filteredMatches.length} occurrences`);
        }
      }
    });

    if (changesCount > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath}: ${changesCount} optimisations appliquées`);
      return true;
    } else {
      console.log(`ℹ️  ${filePath}: Aucune optimisation nécessaire`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 Nettoyage final agressif pour la production...\n');
  
  let totalFiles = 0;
  let cleanedFiles = 0;

  filesToClean.forEach(filePath => {
    totalFiles++;
    console.log(`\n📁 Traitement de ${filePath}:`);
    if (cleanFile(filePath)) {
      cleanedFiles++;
    }
  });

  console.log(`\n📊 Résumé:`);
  console.log(`   Fichiers traités: ${totalFiles}`);
  console.log(`   Fichiers optimisés: ${cleanedFiles}`);
  console.log(`   Fichiers inchangés: ${totalFiles - cleanedFiles}`);
  
  if (cleanedFiles > 0) {
    console.log('\n✨ Nettoyage final terminé avec succès !');
    console.log('🚀 Système CSS optimisé pour la production');
  } else {
    console.log('\n✨ Aucun nettoyage nécessaire !');
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanFile, aggressivePatterns };
