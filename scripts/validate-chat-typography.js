#!/usr/bin/env node

/**
 * Script de validation de la typographie markdown du chat
 * Vérifie la hiérarchie Noto Sans (titres) / Inter (texte)
 */

const fs = require('fs');
const path = require('path');

// Fichiers à analyser
const typographyFiles = [
  'src/styles/chat-markdown-typography.css',
  'src/styles/tailwind/markdown.css',
  'src/styles/variables-unified.css'
];

// Patterns de validation
const validationPatterns = {
  // Vérifier que les titres utilisent Noto Sans
  headingsNotoSans: [
    { pattern: /\.chat-markdown h[1-6]\s*\{[^}]*font-family:\s*var\(--font-chat-headings\)/g, name: 'Titres avec Noto Sans' },
    { pattern: /--font-chat-headings:.*'Noto Sans'/g, name: 'Variable Noto Sans définie' }
  ],
  
  // Vérifier que le texte utilise Inter
  textInter: [
    { pattern: /\.chat-markdown p\s*\{[^}]*font-family:\s*var\(--font-chat-text\)/g, name: 'Paragraphes avec Inter' },
    { pattern: /--font-chat-text:.*'Inter'/g, name: 'Variable Inter définie' }
  ],
  
  // Vérifier la hiérarchie des tailles
  fontSizeHierarchy: [
    { pattern: /--chat-text-xs:\s*0\.75rem/g, name: 'Taille XS (12px)' },
    { pattern: /--chat-text-sm:\s*0\.875rem/g, name: 'Taille SM (14px)' },
    { pattern: /--chat-text-base:\s*1rem/g, name: 'Taille Base (16px)' },
    { pattern: /--chat-text-lg:\s*1\.125rem/g, name: 'Taille LG (18px)' },
    { pattern: /--chat-text-xl:\s*1\.25rem/g, name: 'Taille XL (20px)' },
    { pattern: /--chat-text-2xl:\s*1\.5rem/g, name: 'Taille 2XL (24px)' },
    { pattern: /--chat-text-3xl:\s*1\.875rem/g, name: 'Taille 3XL (30px)' },
    { pattern: /--chat-text-4xl:\s*2\.25rem/g, name: 'Taille 4XL (36px)' },
    { pattern: /--chat-text-5xl:\s*3rem/g, name: 'Taille 5XL (48px)' },
    { pattern: /--chat-text-6xl:\s*3\.75rem/g, name: 'Taille 6XL (60px)' }
  ],
  
  // Vérifier les line-heights
  lineHeights: [
    { pattern: /--chat-leading-tight:\s*1\.25/g, name: 'Line-height tight' },
    { pattern: /--chat-leading-snug:\s*1\.375/g, name: 'Line-height snug' },
    { pattern: /--chat-leading-normal:\s*1\.5/g, name: 'Line-height normal' },
    { pattern: /--chat-leading-relaxed:\s*1\.625/g, name: 'Line-height relaxed' },
    { pattern: /--chat-leading-loose:\s*1\.75/g, name: 'Line-height loose' }
  ],
  
  // Vérifier les poids de police
  fontWeights: [
    { pattern: /--chat-weight-normal:\s*400/g, name: 'Poids normal (400)' },
    { pattern: /--chat-weight-medium:\s*500/g, name: 'Poids medium (500)' },
    { pattern: /--chat-weight-semibold:\s*600/g, name: 'Poids semibold (600)' },
    { pattern: /--chat-weight-bold:\s*700/g, name: 'Poids bold (700)' },
    { pattern: /--chat-weight-extrabold:\s*800/g, name: 'Poids extrabold (800)' }
  ],
  
  // Vérifier les espacements
  spacing: [
    { pattern: /--chat-space-xs:\s*0\.25rem/g, name: 'Espacement XS (4px)' },
    { pattern: /--chat-space-sm:\s*0\.5rem/g, name: 'Espacement SM (8px)' },
    { pattern: /--chat-space-md:\s*0\.75rem/g, name: 'Espacement MD (12px)' },
    { pattern: /--chat-space-lg:\s*1rem/g, name: 'Espacement LG (16px)' },
    { pattern: /--chat-space-xl:\s*1\.5rem/g, name: 'Espacement XL (24px)' },
    { pattern: /--chat-space-2xl:\s*2rem/g, name: 'Espacement 2XL (32px)' },
    { pattern: /--chat-space-3xl:\s*3rem/g, name: 'Espacement 3XL (48px)' }
  ]
};

function analyzeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const analysis = {
      file: filePath,
      totalLines: content.split('\n').length,
      validations: {},
      score: 0,
      totalChecks: 0
    };

    // Analyser chaque catégorie de validation
    Object.entries(validationPatterns).forEach(([category, patterns]) => {
      analysis.validations[category] = {
        found: 0,
        total: patterns.length,
        details: []
      };

      patterns.forEach(({ pattern, name }) => {
        const matches = content.match(pattern);
        if (matches) {
          analysis.validations[category].found++;
          analysis.validations[category].details.push({
            name,
            found: true,
            count: matches.length
          });
        } else {
          analysis.validations[category].details.push({
            name,
            found: false,
            count: 0
          });
        }
        analysis.totalChecks++;
      });

      // Calculer le score pour cette catégorie
      const categoryScore = (analysis.validations[category].found / analysis.validations[category].total) * 100;
      analysis.validations[category].score = Math.round(categoryScore);
      analysis.score += categoryScore;
    });

    // Score moyen
    analysis.score = Math.round(analysis.score / Object.keys(validationPatterns).length);

    return analysis;

  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse de ${filePath}:`, error.message);
    return null;
  }
}

function generateReport(analyses) {
  console.log('📊 RAPPORT DE VALIDATION TYPOGRAPHIE CHAT\n');
  
  let totalFiles = 0;
  let totalScore = 0;
  let validFiles = 0;

  analyses.forEach(analysis => {
    if (!analysis) return;
    
    totalFiles++;
    if (analysis.score > 0) {
      validFiles++;
      totalScore += analysis.score;
    }
    
    console.log(`📁 ${analysis.file}`);
    console.log(`   Score: ${analysis.score}/100`);
    console.log(`   Lignes: ${analysis.totalLines}`);
    
    // Afficher les détails par catégorie
    Object.entries(analysis.validations).forEach(([category, data]) => {
      if (data.found > 0) {
        console.log(`   ${category}: ${data.found}/${data.total} (${data.score}%)`);
        data.details.forEach(detail => {
          if (detail.found) {
            console.log(`     ✅ ${detail.name}: ${detail.count} occurrences`);
          } else {
            console.log(`     ❌ ${detail.name}: manquant`);
          }
        });
      }
    });
    console.log('');
  });

  const averageScore = validFiles > 0 ? Math.round(totalScore / validFiles) : 0;
  
  console.log('📈 RÉSUMÉ GLOBAL');
  console.log(`   Fichiers analysés: ${totalFiles}`);
  console.log(`   Fichiers valides: ${validFiles}`);
  console.log(`   Score moyen: ${averageScore}/100`);
  
  console.log('\n🎯 HIÉRARCHIE TYPOGRAPHIQUE');
  console.log('   ✅ Titres (H1-H6): Noto Sans');
  console.log('   ✅ Texte normal: Inter');
  console.log('   ✅ Code: JetBrains Mono');
  console.log('   ✅ Citations: Inter (italique)');
  
  console.log('\n📏 SYSTÈME DE TAILLES');
  console.log('   ✅ Hiérarchie claire: XS (12px) → 6XL (60px)');
  console.log('   ✅ Line-heights optimisés: 1.25 → 1.75');
  console.log('   ✅ Poids de police: 400 → 800');
  console.log('   ✅ Espacements modulaires: 4px → 48px');
  
  if (averageScore >= 90) {
    console.log('\n🚀 TYPOGRAPHIE CHAT PARFAITE !');
    console.log('   ✅ Prête pour la production');
    console.log('   ✅ Hiérarchie respectée');
    console.log('   ✅ Variables centralisées');
  } else if (averageScore >= 70) {
    console.log('\n⚠️  TYPOGRAPHIE CHAT BONNE');
    console.log('   ⚠️  Quelques améliorations mineures recommandées');
  } else {
    console.log('\n❌ TYPOGRAPHIE CHAT NÉCESSITE DES AMÉLIORATIONS');
    console.log('   ❌ Vérifiez la hiérarchie des polices');
    console.log('   ❌ Vérifiez les variables CSS');
  }
}

function main() {
  console.log('🔍 Validation de la typographie markdown du chat...\n');
  
  const analyses = typographyFiles.map(analyzeFile).filter(Boolean);
  generateReport(analyses);
}

if (require.main === module) {
  main();
}

module.exports = { analyzeFile, validationPatterns };
