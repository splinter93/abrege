#!/usr/bin/env node

/**
 * Script de nettoyage final CSS
 * Supprime les derniers !important et optimise les imports
 */

const fs = require('fs');
const path = require('path');

// Fichiers à nettoyer en priorité
const priorityFiles = [
  'src/styles/markdown.css',
  'src/styles/unified-blocks.css',
  'src/styles/typography.css'
];

// Patterns de nettoyage final
const finalCleanupPatterns = [
  // Supprimer les !important restants (sauf pour les cas critiques)
  { 
    pattern: /([^;]+)\s*!important;?/g, 
    replacement: '$1;',
    description: '!important supprimés',
    exclude: ['z-index', 'position', 'display: none', 'visibility: hidden']
  },
  
  // Optimiser les imports de polices - garder seulement les essentiels
  { 
    pattern: /@import\s+url\([^)]*fonts\.googleapis\.com[^)]*family=([^&]+)[^)]*\);/g, 
    replacement: (match, family) => {
      const essentialFonts = ['Noto+Sans', 'Inter', 'JetBrains+Mono'];
      const fontName = family.replace(/\+/g, ' ');
      if (essentialFonts.some(f => fontName.includes(f.replace(/\+/g, ' ')))) {
        return match; // Garder les polices essentielles
      }
      return ''; // Supprimer les autres
    },
    description: 'Imports de polices optimisés'
  },
  
  // Supprimer les variables glassmorphism dupliquées
  { 
    pattern: /--glass-[a-z-]+:\s*[^;]+;\s*(?=.*--glass-[a-z-]+:)/g, 
    replacement: '',
    description: 'Variables glassmorphism dupliquées supprimées'
  },
  
  // Nettoyer les commentaires redondants
  { 
    pattern: /\/\*.*GLASSMORPHISM.*\*\/[\s\S]*?(?=\/\*|\n\s*\n|$)/g, 
    replacement: '',
    description: 'Commentaires redondants supprimés'
  },
  
  // Nettoyer les espaces et lignes vides
  { 
    pattern: /\n\s*\n\s*\n/g, 
    replacement: '\n\n',
    description: 'Espaces multiples nettoyés'
  },
  
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
    finalCleanupPatterns.forEach(({ pattern, replacement, description, exclude }) => {
      if (typeof replacement === 'function') {
        const matches = content.match(pattern);
        if (matches) {
          changesCount += matches.length;
          content = content.replace(pattern, replacement);
          console.log(`   - ${description}: ${matches.length} occurrences`);
        }
      } else {
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
  console.log('🧹 Nettoyage final CSS - Optimisation production...\n');
  
  let totalFiles = 0;
  let cleanedFiles = 0;

  priorityFiles.forEach(filePath => {
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
    console.log('🚀 Structure CSS optimisée pour la production');
  } else {
    console.log('\n✨ Aucun nettoyage nécessaire !');
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanFile, finalCleanupPatterns };
