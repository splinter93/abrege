#!/usr/bin/env node

/**
 * Script d'audit intelligent de la hiérarchie typographique
 * Comprend les variables CSS et valide la hiérarchie correctement
 */

const fs = require('fs');
const path = require('path');

console.log('🧠 Audit intelligent de la hiérarchie typographique...\n');

// Résultats de l'audit
const auditResults = {
  correct: [],
  incorrect: [],
  warnings: [],
  summary: {
    totalFiles: 0,
    correctFiles: 0,
    issuesFound: 0
  }
};

// Fonction pour analyser un fichier CSS
function analyzeCSSFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  auditResults.summary.totalFiles++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fileIssues = 0;
  let fileCorrect = 0;
  
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
      
      // Vérifier la hiérarchie - accepter les variables CSS
      if (isHeading && (line.includes('Noto Sans') || line.includes('--font-chat-headings') || line.includes('--font-editor-headings'))) {
        auditResults.correct.push(`${filePath}:${lineNum} - Titre avec Noto Sans ✓`);
        fileCorrect++;
      } else if (isHeading && !line.includes('Noto Sans') && !line.includes('--font-chat-headings') && !line.includes('--font-editor-headings')) {
        auditResults.incorrect.push(`${filePath}:${lineNum} - Titre sans Noto Sans: ${line.trim()}`);
        fileIssues++;
      }
      
      if (isText && (line.includes('Inter') || line.includes('--font-chat-text') || line.includes('--font-editor-text'))) {
        auditResults.correct.push(`${filePath}:${lineNum} - Texte avec Inter ✓`);
        fileCorrect++;
      } else if (isText && !line.includes('Inter') && !line.includes('--font-chat-text') && !line.includes('--font-editor-text')) {
        auditResults.incorrect.push(`${filePath}:${lineNum} - Texte sans Inter: ${line.trim()}`);
        fileIssues++;
      }
      
      if (isCode && (line.includes('JetBrains Mono') || line.includes('--font-mono'))) {
        auditResults.correct.push(`${filePath}:${lineNum} - Code avec JetBrains Mono ✓`);
        fileCorrect++;
      } else if (isCode && !line.includes('JetBrains Mono') && !line.includes('--font-mono')) {
        auditResults.incorrect.push(`${filePath}:${lineNum} - Code sans JetBrains Mono: ${line.trim()}`);
        fileIssues++;
      }
      
      // Vérifier les polices hardcodées non standard
      if (line.includes('SF Mono') || line.includes('Monaco') || line.includes('Cascadia Code') || 
          line.includes('Roboto Mono') || line.includes('Courier New')) {
        auditResults.warnings.push(`${filePath}:${lineNum} - Police hardcodée: ${line.trim()}`);
      }
    }
  });
  
  if (fileIssues === 0) {
    auditResults.summary.correctFiles++;
  }
  auditResults.summary.issuesFound += fileIssues;
}

// Fonction pour analyser un fichier TSX
function analyzeTSXFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  auditResults.summary.totalFiles++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fileIssues = 0;
  let fileCorrect = 0;
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Chercher les déclarations fontFamily
    if (line.includes('fontFamily') || line.includes('font-family')) {
      if (line.includes('Noto Sans') || line.includes('Inter') || line.includes('JetBrains Mono')) {
        auditResults.correct.push(`${filePath}:${lineNum} - Police correcte: ${line.trim()}`);
        fileCorrect++;
      } else if (line.includes('Arial') || line.includes('sans-serif')) {
        // Accepter les fallbacks
        auditResults.correct.push(`${filePath}:${lineNum} - Police avec fallback: ${line.trim()}`);
        fileCorrect++;
      } else {
        auditResults.incorrect.push(`${filePath}:${lineNum} - Police non standard: ${line.trim()}`);
        fileIssues++;
      }
    }
  });
  
  if (fileIssues === 0) {
    auditResults.summary.correctFiles++;
  }
  auditResults.summary.issuesFound += fileIssues;
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

// Vérifier les imports de polices
console.log('\n🔍 Vérification des imports de polices...');
const globalsFile = 'src/app/globals.css';
if (fs.existsSync(globalsFile)) {
  const content = fs.readFileSync(globalsFile, 'utf8');
  
  if (content.includes('@import url(\'https://fonts.googleapis.com/css2?family=Noto+Sans')) {
    auditResults.correct.push('Import: Noto Sans ✓');
  } else {
    auditResults.incorrect.push('Import: Noto Sans manquant');
  }
  
  if (content.includes('@import url(\'https://fonts.googleapis.com/css2?family=Inter')) {
    auditResults.correct.push('Import: Inter ✓');
  } else {
    auditResults.incorrect.push('Import: Inter manquant');
  }
  
  if (content.includes('@import url(\'https://fonts.googleapis.com/css2?family=JetBrains+Mono')) {
    auditResults.correct.push('Import: JetBrains Mono ✓');
  } else {
    auditResults.incorrect.push('Import: JetBrains Mono manquant');
  }
}

// Afficher les résultats
console.log('\n📊 RÉSULTATS DE L\'AUDIT INTELLIGENT\n');

if (auditResults.correct.length > 0) {
  console.log('✅ CORRECT (' + auditResults.correct.length + '):');
  auditResults.correct.slice(0, 10).forEach(result => console.log(`  ${result}`));
  if (auditResults.correct.length > 10) {
    console.log(`  ... et ${auditResults.correct.length - 10} autres`);
  }
  console.log('');
}

if (auditResults.incorrect.length > 0) {
  console.log('❌ INCORRECT (' + auditResults.incorrect.length + '):');
  auditResults.incorrect.slice(0, 10).forEach(result => console.log(`  ${result}`));
  if (auditResults.incorrect.length > 10) {
    console.log(`  ... et ${auditResults.incorrect.length - 10} autres`);
  }
  console.log('');
}

if (auditResults.warnings.length > 0) {
  console.log('⚠️  WARNINGS (' + auditResults.warnings.length + '):');
  auditResults.warnings.slice(0, 5).forEach(result => console.log(`  ${result}`));
  if (auditResults.warnings.length > 5) {
    console.log(`  ... et ${auditResults.warnings.length - 5} autres`);
  }
  console.log('');
}

// Calculer le score
const totalChecks = auditResults.correct.length + auditResults.incorrect.length;
const score = totalChecks > 0 ? Math.round((auditResults.correct.length / totalChecks) * 100) : 0;

console.log(`📈 SCORE: ${score}% (${auditResults.correct.length}/${totalChecks})`);
console.log(`📁 FICHIERS: ${auditResults.summary.correctFiles}/${auditResults.summary.totalFiles} corrects`);
console.log(`🔧 PROBLÈMES: ${auditResults.summary.issuesFound} trouvés`);

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

if (auditResults.warnings.length > 0) {
  console.log('• ⚠️  Remplacer les polices hardcodées par des variables');
}

console.log('\n🎯 HIÉRARCHIE ATTENDUE:');
console.log('• 📝 Noto Sans: Titres (H1-H6)');
console.log('• 📝 Inter: Texte normal, paragraphes, citations');
console.log('• 💻 JetBrains Mono: Code inline et blocs');

console.log('\n✨ Audit intelligent terminé !');
