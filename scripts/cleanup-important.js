#!/usr/bin/env node

/**
 * Script de nettoyage des !important excessifs
 * Supprime les !important non nécessaires pour améliorer la maintenabilité
 */

const fs = require('fs');
const path = require('path');

// Fichiers CSS à nettoyer
const cssFiles = [
  'src/styles/markdown.css',
  'src/styles/unified-blocks.css',
  'src/styles/public-note.css',
  'src/styles/pages/dossiers.css',
  'src/styles/pages/fichiers.css',
  'src/styles/mermaid.css',
  'src/styles/page-title-containers.css',
  'src/styles/syntax-highlighting.css',
  'src/styles/codeBlockButtons.css'
];

// Patterns de !important à supprimer (règles communes)
const patternsToClean = [
  // Couleurs
  { pattern: /color:\s*([^;]+)\s*!important;?/g, replacement: 'color: $1;' },
  { pattern: /background:\s*([^;]+)\s*!important;?/g, replacement: 'background: $1;' },
  { pattern: /background-color:\s*([^;]+)\s*!important;?/g, replacement: 'background-color: $1;' },
  
  // Typographie
  { pattern: /font-family:\s*([^;]+)\s*!important;?/g, replacement: 'font-family: $1;' },
  { pattern: /font-size:\s*([^;]+)\s*!important;?/g, replacement: 'font-size: $1;' },
  { pattern: /font-weight:\s*([^;]+)\s*!important;?/g, replacement: 'font-weight: $1;' },
  { pattern: /line-height:\s*([^;]+)\s*!important;?/g, replacement: 'line-height: $1;' },
  
  // Espacement
  { pattern: /margin:\s*([^;]+)\s*!important;?/g, replacement: 'margin: $1;' },
  { pattern: /padding:\s*([^;]+)\s*!important;?/g, replacement: 'padding: $1;' },
  { pattern: /margin-top:\s*([^;]+)\s*!important;?/g, replacement: 'margin-top: $1;' },
  { pattern: /margin-bottom:\s*([^;]+)\s*!important;?/g, replacement: 'margin-bottom: $1;' },
  { pattern: /margin-left:\s*([^;]+)\s*!important;?/g, replacement: 'margin-left: $1;' },
  { pattern: /margin-right:\s*([^;]+)\s*!important;?/g, replacement: 'margin-right: $1;' },
  { pattern: /padding-top:\s*([^;]+)\s*!important;?/g, replacement: 'padding-top: $1;' },
  { pattern: /padding-bottom:\s*([^;]+)\s*!important;?/g, replacement: 'padding-bottom: $1;' },
  { pattern: /padding-left:\s*([^;]+)\s*!important;?/g, replacement: 'padding-left: $1;' },
  { pattern: /padding-right:\s*([^;]+)\s*!important;?/g, replacement: 'padding-right: $1;' },
  
  // Bordures
  { pattern: /border:\s*([^;]+)\s*!important;?/g, replacement: 'border: $1;' },
  { pattern: /border-radius:\s*([^;]+)\s*!important;?/g, replacement: 'border-radius: $1;' },
  
  // Display et position
  { pattern: /display:\s*([^;]+)\s*!important;?/g, replacement: 'display: $1;' },
  { pattern: /text-align:\s*([^;]+)\s*!important;?/g, replacement: 'text-align: $1;' },
  { pattern: /width:\s*([^;]+)\s*!important;?/g, replacement: 'width: $1;' },
  { pattern: /height:\s*([^;]+)\s*!important;?/g, replacement: 'height: $1;' },
  
  // Flexbox
  { pattern: /flex:\s*([^;]+)\s*!important;?/g, replacement: 'flex: $1;' },
  { pattern: /justify-content:\s*([^;]+)\s*!important;?/g, replacement: 'justify-content: $1;' },
  { pattern: /align-items:\s*([^;]+)\s*!important;?/g, replacement: 'align-items: $1;' },
  
  // Opacité et visibilité
  { pattern: /opacity:\s*([^;]+)\s*!important;?/g, replacement: 'opacity: $1;' },
  { pattern: /visibility:\s*([^;]+)\s*!important;?/g, replacement: 'visibility: $1;' }
];

function cleanImportantFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changesCount = 0;

    // Appliquer tous les patterns de nettoyage
    patternsToClean.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        changesCount += matches.length;
        content = content.replace(pattern, replacement);
      }
    });

    if (changesCount > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath}: ${changesCount} !important supprimés`);
      return true;
    } else {
      console.log(`ℹ️  ${filePath}: Aucun !important à nettoyer`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 Nettoyage des !important excessifs...\n');
  
  let totalFiles = 0;
  let cleanedFiles = 0;

  cssFiles.forEach(filePath => {
    totalFiles++;
    if (cleanImportantFromFile(filePath)) {
      cleanedFiles++;
    }
  });

  console.log(`\n📊 Résumé:`);
  console.log(`   Fichiers traités: ${totalFiles}`);
  console.log(`   Fichiers nettoyés: ${cleanedFiles}`);
  console.log(`   Fichiers inchangés: ${totalFiles - cleanedFiles}`);
  
  if (cleanedFiles > 0) {
    console.log('\n✨ Nettoyage terminé avec succès !');
  } else {
    console.log('\n✨ Aucun nettoyage nécessaire !');
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanImportantFromFile, patternsToClean };
