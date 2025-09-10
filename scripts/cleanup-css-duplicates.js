#!/usr/bin/env node

/**
 * Script de nettoyage des doublons CSS
 * Supprime les définitions redondantes et optimise la structure
 */

const fs = require('fs');
const path = require('path');

// Fichiers à nettoyer
const filesToClean = [
  'src/styles/chat-global.css',
  'src/styles/chat-utilities.css',
  'src/styles/tailwind/markdown.css',
  'src/styles/typography.css',
  'src/styles/markdown.css',
  'src/styles/unified-blocks.css'
];

// Patterns de nettoyage des doublons
const cleanupPatterns = [
  // Supprimer les font-family redondants (garder seulement les variables)
  { 
    pattern: /font-family:\s*'[^']+',\s*[^;]+;/g, 
    replacement: 'font-family: var(--font-base);',
    description: 'Font-family redondants remplacés par variables'
  },
  
  // Supprimer les backdrop-filter redondants
  { 
    pattern: /backdrop-filter:\s*blur\([^)]+\);\s*-webkit-backdrop-filter:\s*blur\([^)]+\);/g, 
    replacement: 'backdrop-filter: var(--glass-blur-medium);\n  -webkit-backdrop-filter: var(--glass-blur-medium);',
    description: 'Backdrop-filter redondants remplacés par variables'
  },
  
  // Supprimer les box-shadow redondants
  { 
    pattern: /box-shadow:\s*0\s+\d+px\s+\d+px\s+rgba\([^)]+\);/g, 
    replacement: 'box-shadow: var(--glass-shadow-soft);',
    description: 'Box-shadow redondants remplacés par variables'
  },
  
  // Supprimer les border-radius redondants
  { 
    pattern: /border-radius:\s*\d+px;/g, 
    replacement: 'border-radius: var(--radius-md);',
    description: 'Border-radius redondants remplacés par variables'
  },
  
  // Supprimer les transition redondants
  { 
    pattern: /transition:\s*all\s+0\.2s\s+ease;/g, 
    replacement: 'transition: all var(--transition-normal);',
    description: 'Transition redondants remplacés par variables'
  },
  
  // Supprimer les classes CSS dupliquées (garder la première occurrence)
  { 
    pattern: /(\.[a-z-]+\s*\{[^}]*\})\s*(?=.*\1)/g, 
    replacement: '',
    description: 'Classes CSS dupliquées supprimées'
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

function cleanDuplicatesFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changesCount = 0;

    // Appliquer tous les patterns de nettoyage
    cleanupPatterns.forEach(({ pattern, replacement, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        changesCount += matches.length;
        content = content.replace(pattern, replacement);
        if (matches.length > 0) {
          console.log(`   - ${description}: ${matches.length} occurrences`);
        }
      }
    });

    if (changesCount > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath}: ${changesCount} doublons nettoyés`);
      return true;
    } else {
      console.log(`ℹ️  ${filePath}: Aucun doublon à nettoyer`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 Nettoyage des doublons CSS...\n');
  
  let totalFiles = 0;
  let cleanedFiles = 0;

  filesToClean.forEach(filePath => {
    totalFiles++;
    console.log(`\n📁 Traitement de ${filePath}:`);
    if (cleanDuplicatesFromFile(filePath)) {
      cleanedFiles++;
    }
  });

  console.log(`\n📊 Résumé:`);
  console.log(`   Fichiers traités: ${totalFiles}`);
  console.log(`   Fichiers nettoyés: ${cleanedFiles}`);
  console.log(`   Fichiers inchangés: ${totalFiles - cleanedFiles}`);
  
  if (cleanedFiles > 0) {
    console.log('\n✨ Nettoyage des doublons terminé avec succès !');
    console.log('💡 Structure CSS optimisée et centralisée');
  } else {
    console.log('\n✨ Aucun nettoyage nécessaire !');
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanDuplicatesFromFile, cleanupPatterns };
