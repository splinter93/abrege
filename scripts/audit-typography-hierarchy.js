#!/usr/bin/env node

/**
 * Script d'audit de la hiérarchie typographique
 * Vérifie que la hiérarchie Noto Sans (titres) / Inter (texte) / JetBrains Mono (code) est respectée
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Audit de la hiérarchie typographique...\n');

// Hiérarchie attendue
const EXPECTED_HIERARCHY = {
  headings: 'Noto Sans',
  text: 'Inter', 
  code: 'JetBrains Mono'
};

// Résultats de l'audit
const auditResults = {
  correct: [],
  incorrect: [],
  missing: [],
  warnings: []
};

// Fonction pour analyser un fichier CSS
function analyzeCSSFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Chercher les déclarations font-family
    if (line.includes('font-family')) {
      const isHeading = line.includes('h1') || line.includes('h2') || line.includes('h3') || 
                       line.includes('h4') || line.includes('h5') || line.includes('h6') ||
                       line.includes('heading') || line.includes('title');
      
      const isCode = line.includes('code') || line.includes('pre') || line.includes('mono') ||
                    line.includes('console') || line.includes('terminal');
      
      const isText = line.includes('p') || line.includes('body') || line.includes('text') ||
                    line.includes('paragraph') || line.includes('content');
      
      // Vérifier la hiérarchie
      if (isHeading && line.includes('Noto Sans')) {
        auditResults.correct.push(`${filePath}:${lineNum} - Titre avec Noto Sans ✓`);
      } else if (isHeading && !line.includes('Noto Sans')) {
        auditResults.incorrect.push(`${filePath}:${lineNum} - Titre sans Noto Sans: ${line.trim()}`);
      }
      
      if (isText && line.includes('Inter')) {
        auditResults.correct.push(`${filePath}:${lineNum} - Texte avec Inter ✓`);
      } else if (isText && !line.includes('Inter')) {
        auditResults.incorrect.push(`${filePath}:${lineNum} - Texte sans Inter: ${line.trim()}`);
      }
      
      if (isCode && line.includes('JetBrains Mono')) {
        auditResults.correct.push(`${filePath}:${lineNum} - Code avec JetBrains Mono ✓`);
      } else if (isCode && !line.includes('JetBrains Mono')) {
        auditResults.incorrect.push(`${filePath}:${lineNum} - Code sans JetBrains Mono: ${line.trim()}`);
      }
    }
  });
}

// Fonction pour analyser un fichier TSX
function analyzeTSXFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Chercher les déclarations fontFamily
    if (line.includes('fontFamily') || line.includes('font-family')) {
      if (line.includes('Noto Sans') || line.includes('Inter') || line.includes('JetBrains Mono')) {
        auditResults.correct.push(`${filePath}:${lineNum} - Police correcte: ${line.trim()}`);
      } else {
        auditResults.incorrect.push(`${filePath}:${lineNum} - Police non standard: ${line.trim()}`);
      }
    }
  });
}

// Analyser les fichiers CSS principaux
console.log('📄 Analyse des fichiers CSS...');
const cssFiles = [
  'src/styles/variables-unified.css',
  'src/styles/typography.css',
  'src/styles/chat-markdown-typography.css',
  'src/styles/design-system.css',
  'src/styles/chat-design-system-v2.css'
];

cssFiles.forEach(file => {
  console.log(`  🔍 ${file}`);
  analyzeCSSFile(file);
});

// Analyser les composants de chat
console.log('\n📄 Analyse des composants de chat...');
const chatFiles = [
  'src/components/chat/ChatBubbles.css',
  'src/components/chat/ChatLayout.css',
  'src/components/chat/ChatSidebar.css',
  'src/components/chat/ChatMessage.css'
];

chatFiles.forEach(file => {
  console.log(`  🔍 ${file}`);
  analyzeCSSFile(file);
});

// Analyser les composants React
console.log('\n📄 Analyse des composants React...');
const reactFiles = [
  'src/components/chat/ChatFullscreenV2.tsx',
  'src/components/editor/ModernToolbar.tsx',
  'src/components/Header.tsx',
  'src/components/EditorTitle.tsx'
];

reactFiles.forEach(file => {
  console.log(`  🔍 ${file}`);
  analyzeTSXFile(file);
});

// Vérifier les variables CSS centralisées
console.log('\n🎯 Vérification des variables centralisées...');
const variablesFile = 'src/styles/variables-unified.css';
if (fs.existsSync(variablesFile)) {
  const content = fs.readFileSync(variablesFile, 'utf8');
  
  if (content.includes('--font-chat-headings: \'Noto Sans\'')) {
    auditResults.correct.push('Variables: --font-chat-headings avec Noto Sans ✓');
  } else {
    auditResults.incorrect.push('Variables: --font-chat-headings manquant ou incorrect');
  }
  
  if (content.includes('--font-chat-text: \'Inter\'')) {
    auditResults.correct.push('Variables: --font-chat-text avec Inter ✓');
  } else {
    auditResults.incorrect.push('Variables: --font-chat-text manquant ou incorrect');
  }
  
  if (content.includes('--font-mono: \'JetBrains Mono\'')) {
    auditResults.correct.push('Variables: --font-mono avec JetBrains Mono ✓');
  } else {
    auditResults.incorrect.push('Variables: --font-mono manquant ou incorrect');
  }
}

// Afficher les résultats
console.log('\n📊 RÉSULTATS DE L\'AUDIT\n');

if (auditResults.correct.length > 0) {
  console.log('✅ CORRECT (' + auditResults.correct.length + '):');
  auditResults.correct.forEach(result => console.log(`  ${result}`));
  console.log('');
}

if (auditResults.incorrect.length > 0) {
  console.log('❌ INCORRECT (' + auditResults.incorrect.length + '):');
  auditResults.incorrect.forEach(result => console.log(`  ${result}`));
  console.log('');
}

// Calculer le score
const totalChecks = auditResults.correct.length + auditResults.incorrect.length;
const score = totalChecks > 0 ? Math.round((auditResults.correct.length / totalChecks) * 100) : 0;

console.log(`📈 SCORE: ${score}% (${auditResults.correct.length}/${totalChecks})`);

// Recommandations
console.log('\n💡 RECOMMANDATIONS:');
if (auditResults.incorrect.length > 0) {
  console.log('• Corriger les polices non conformes à la hiérarchie');
  console.log('• Utiliser les variables CSS centralisées (--font-chat-headings, --font-chat-text, --font-mono)');
  console.log('• Remplacer les polices hardcodées par les variables');
} else {
  console.log('• ✅ Hiérarchie typographique respectée !');
  console.log('• ✅ Utilisation cohérente des variables CSS');
  console.log('• ✅ Polices correctement appliquées');
}

console.log('\n🎯 HIÉRARCHIE ATTENDUE:');
console.log('• 📝 Noto Sans: Titres (H1-H6)');
console.log('• 📝 Inter: Texte normal, paragraphes, citations');
console.log('• 💻 JetBrains Mono: Code inline et blocs');

console.log('\n✨ Audit terminé !');
