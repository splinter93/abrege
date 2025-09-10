#!/usr/bin/env node

/**
 * Script d'analyse des doublons CSS
 * Identifie les règles CSS dupliquées pour optimiser la structure
 */

const fs = require('fs');
const path = require('path');

// Fichiers CSS à analyser
const cssFiles = [
  'src/styles/chat-design-system-v2.css',
  'src/styles/chat-global.css',
  'src/styles/chat-utilities.css',
  'src/styles/tailwind/components.css',
  'src/styles/tailwind/utilities.css',
  'src/styles/tailwind/markdown.css',
  'src/styles/typography.css',
  'src/styles/markdown.css',
  'src/styles/unified-blocks.css'
];

// Patterns de doublons courants
const duplicatePatterns = [
  // Variables CSS dupliquées
  { pattern: /--chat-[a-z-]+:\s*[^;]+;/g, name: 'Variables chat' },
  { pattern: /--editor-[a-z-]+:\s*[^;]+;/g, name: 'Variables éditeur' },
  { pattern: /--font-[a-z-]+:\s*[^;]+;/g, name: 'Variables polices' },
  { pattern: /--color-[a-z-]+:\s*[^;]+;/g, name: 'Variables couleurs' },
  { pattern: /--spacing-[a-z-]+:\s*[^;]+;/g, name: 'Variables espacement' },
  { pattern: /--radius-[a-z-]+:\s*[^;]+;/g, name: 'Variables rayons' },
  { pattern: /--shadow-[a-z-]+:\s*[^;]+;/g, name: 'Variables ombres' },
  { pattern: /--transition-[a-z-]+:\s*[^;]+;/g, name: 'Variables transitions' },
  
  // Classes CSS dupliquées
  { pattern: /\.chat-[a-z-]+\s*\{[^}]*\}/g, name: 'Classes chat' },
  { pattern: /\.editor-[a-z-]+\s*\{[^}]*\}/g, name: 'Classes éditeur' },
  { pattern: /\.markdown-[a-z-]+\s*\{[^}]*\}/g, name: 'Classes markdown' },
  { pattern: /\.glass[a-z-]*\s*\{[^}]*\}/g, name: 'Classes glassmorphism' },
  { pattern: /\.btn[a-z-]*\s*\{[^}]*\}/g, name: 'Classes boutons' },
  { pattern: /\.input[a-z-]*\s*\{[^}]*\}/g, name: 'Classes inputs' },
  
  // Règles CSS communes
  { pattern: /font-family:\s*[^;]+;/g, name: 'Font-family' },
  { pattern: /backdrop-filter:\s*[^;]+;/g, name: 'Backdrop-filter' },
  { pattern: /box-shadow:\s*[^;]+;/g, name: 'Box-shadow' },
  { pattern: /border-radius:\s*[^;]+;/g, name: 'Border-radius' },
  { pattern: /transition:\s*[^;]+;/g, name: 'Transition' }
];

function analyzeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const analysis = {
      file: filePath,
      totalLines: content.split('\n').length,
      duplicates: {},
      totalDuplicates: 0
    };

    // Analyser chaque pattern
    duplicatePatterns.forEach(({ pattern, name }) => {
      const matches = content.match(pattern);
      if (matches) {
        const uniqueMatches = [...new Set(matches)];
        if (uniqueMatches.length < matches.length) {
          analysis.duplicates[name] = {
            total: matches.length,
            unique: uniqueMatches.length,
            duplicates: matches.length - uniqueMatches.length,
            examples: uniqueMatches.slice(0, 3)
          };
          analysis.totalDuplicates += matches.length - uniqueMatches.length;
        }
      }
    });

    return analysis;

  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse de ${filePath}:`, error.message);
    return null;
  }
}

function generateReport(analyses) {
  console.log('📊 RAPPORT D\'ANALYSE DES DOUBLONS CSS\n');
  
  let totalFiles = 0;
  let filesWithDuplicates = 0;
  let totalDuplicates = 0;

  analyses.forEach(analysis => {
    if (!analysis) return;
    
    totalFiles++;
    if (analysis.totalDuplicates > 0) {
      filesWithDuplicates++;
      totalDuplicates += analysis.totalDuplicates;
      
      console.log(`📁 ${analysis.file}`);
      console.log(`   Lignes totales: ${analysis.totalLines}`);
      console.log(`   Doublons totaux: ${analysis.totalDuplicates}`);
      
      Object.entries(analysis.duplicates).forEach(([type, data]) => {
        console.log(`   - ${type}: ${data.duplicates} doublons (${data.total} total, ${data.unique} uniques)`);
        if (data.examples.length > 0) {
          console.log(`     Exemples: ${data.examples.join(', ')}`);
        }
      });
      console.log('');
    }
  });

  console.log('📈 RÉSUMÉ GLOBAL');
  console.log(`   Fichiers analysés: ${totalFiles}`);
  console.log(`   Fichiers avec doublons: ${filesWithDuplicates}`);
  console.log(`   Doublons totaux: ${totalDuplicates}`);
  
  if (totalDuplicates > 0) {
    console.log('\n💡 RECOMMANDATIONS');
    console.log('   1. Centraliser les variables dans variables-unified.css');
    console.log('   2. Créer des classes utilitaires réutilisables');
    console.log('   3. Supprimer les définitions redondantes');
    console.log('   4. Utiliser des mixins CSS pour les patterns communs');
  } else {
    console.log('\n✨ Aucun doublon détecté ! Structure CSS optimale.');
  }
}

function main() {
  console.log('🔍 Analyse des doublons CSS...\n');
  
  const analyses = cssFiles.map(analyzeFile).filter(Boolean);
  generateReport(analyses);
}

if (require.main === module) {
  main();
}

module.exports = { analyzeFile, duplicatePatterns };
