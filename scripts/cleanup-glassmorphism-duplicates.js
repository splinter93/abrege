#!/usr/bin/env node

/**
 * Script de nettoyage des doublons glassmorphism
 * Supprime les définitions glassmorphism redondantes pour centraliser le système
 */

const fs = require('fs');
const path = require('path');

// Fichiers à nettoyer (exclure le système centralisé)
const filesToClean = [
  'src/styles/chat-utilities.css',
  'src/styles/tailwind/components.css',
  'src/styles/tailwind/utilities.css',
  'src/styles/pages/dossiers.css',
  'src/styles/pages/fichiers.css',
  'src/styles/pages/classeurs.css',
  'src/styles/unified-sidebar-system.css',
  'src/styles/design-system.css'
];

// Patterns glassmorphism à supprimer (définitions redondantes)
const glassmorphismPatterns = [
  // Variables glassmorphism
  { pattern: /--glass-bg-base:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-bg-subtle:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-bg-soft:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-bg-medium:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-bg-strong:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-border-subtle:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-border-soft:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-border-medium:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-border-strong:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-border-focus:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-blur-light:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-blur-medium:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-blur-strong:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-blur-heavy:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-shadow-subtle:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-shadow-soft:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-shadow-medium:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-shadow-strong:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-gradient-subtle:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-gradient-soft:\s*[^;]+;/g, replacement: '' },
  { pattern: /--glass-gradient-medium:\s*[^;]+;/g, replacement: '' },
  
  // Classes glassmorphism redondantes
  { pattern: /\.glass\s*\{[^}]*\}/g, replacement: '' },
  { pattern: /\.glass-subtle\s*\{[^}]*\}/g, replacement: '' },
  { pattern: /\.glass-soft\s*\{[^}]*\}/g, replacement: '' },
  { pattern: /\.glass-medium\s*\{[^}]*\}/g, replacement: '' },
  { pattern: /\.glass-strong\s*\{[^}]*\}/g, replacement: '' },
  { pattern: /\.btn-glass\s*\{[^}]*\}/g, replacement: '' },
  { pattern: /\.input-glass\s*\{[^}]*\}/g, replacement: '' },
  { pattern: /\.card-glass\s*\{[^}]*\}/g, replacement: '' },
  
  // Effets backdrop-filter redondants
  { pattern: /backdrop-filter:\s*blur\([^)]+\);\s*-webkit-backdrop-filter:\s*blur\([^)]+\);/g, replacement: '' },
  { pattern: /backdrop-filter:\s*blur\([^)]+\);/g, replacement: '' },
  { pattern: /-webkit-backdrop-filter:\s*blur\([^)]+\);/g, replacement: '' },
  
  // Commentaires glassmorphism
  { pattern: /\/\*.*GLASSMORPHISM.*\*\/[\s\S]*?(?=\/\*|\n\s*\n|$)/g, replacement: '' },
  { pattern: /\/\*.*glass.*\*\/[\s\S]*?(?=\/\*|\n\s*\n|$)/g, replacement: '' }
];

function cleanGlassmorphismDuplicates(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changesCount = 0;

    // Appliquer tous les patterns de nettoyage
    glassmorphismPatterns.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        changesCount += matches.length;
        content = content.replace(pattern, replacement);
      }
    });

    // Nettoyer les lignes vides multiples
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Nettoyer les espaces en fin de ligne
    content = content.replace(/[ \t]+$/gm, '');

    if (changesCount > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath}: ${changesCount} doublons glassmorphism supprimés`);
      return true;
    } else {
      console.log(`ℹ️  ${filePath}: Aucun doublon glassmorphism trouvé`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage de ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 Nettoyage des doublons glassmorphism...\n');
  
  let totalFiles = 0;
  let cleanedFiles = 0;

  filesToClean.forEach(filePath => {
    totalFiles++;
    if (cleanGlassmorphismDuplicates(filePath)) {
      cleanedFiles++;
    }
  });

  console.log(`\n📊 Résumé:`);
  console.log(`   Fichiers traités: ${totalFiles}`);
  console.log(`   Fichiers nettoyés: ${cleanedFiles}`);
  console.log(`   Fichiers inchangés: ${totalFiles - cleanedFiles}`);
  
  if (cleanedFiles > 0) {
    console.log('\n✨ Nettoyage des doublons terminé avec succès !');
    console.log('💡 Le système glassmorphism est maintenant centralisé dans glassmorphism-system.css');
  } else {
    console.log('\n✨ Aucun doublon à nettoyer !');
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanGlassmorphismDuplicates, glassmorphismPatterns };
