#!/usr/bin/env node

/**
 * Script de correction automatique de la hiérarchie typographique
 * Remplace les polices hardcodées par les variables CSS centralisées
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction automatique de la hiérarchie typographique...\n');

// Règles de remplacement
const replacements = [
  // Code - remplacer par var(--font-mono)
  {
    pattern: /font-family:\s*['"](?:SF Mono|Monaco|Cascadia Code|Roboto Mono|Consolas|Courier New|Menlo|Fira Code)['"][^;]*;/g,
    replacement: 'font-family: var(--font-mono);',
    description: 'Code → var(--font-mono)'
  },
  {
    pattern: /font-family:\s*['"]JetBrains Mono['"][^;]*;/g,
    replacement: 'font-family: var(--font-mono);',
    description: 'JetBrains Mono → var(--font-mono)'
  },
  
  // Titres - remplacer par var(--font-chat-headings) ou var(--font-editor-headings)
  {
    pattern: /font-family:\s*['"]Noto Sans['"][^;]*;/g,
    replacement: 'font-family: var(--font-chat-headings);',
    description: 'Noto Sans → var(--font-chat-headings)'
  },
  
  // Texte - remplacer par var(--font-chat-text) ou var(--font-editor-text)
  {
    pattern: /font-family:\s*['"]Inter['"][^;]*;/g,
    replacement: 'font-family: var(--font-chat-text);',
    description: 'Inter → var(--font-chat-text)'
  },
  
  // Variables de compatibilité
  {
    pattern: /font-family:\s*var\(--font-chat-text\);/g,
    replacement: 'font-family: var(--font-chat-text);',
    description: 'Variable chat-text'
  },
  {
    pattern: /font-family:\s*var\(--font-chat-headings\);/g,
    replacement: 'font-family: var(--font-chat-headings);',
    description: 'Variable chat-headings'
  },
  {
    pattern: /font-family:\s*var\(--font-mono\);/g,
    replacement: 'font-family: var(--font-mono);',
    description: 'Variable mono'
  }
];

// Fonction pour traiter un fichier
function processFile(filePath) {
  if (!fs.existsSync(filePath)) return { processed: 0, changes: [] };
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = [];
  let totalReplacements = 0;
  
  replacements.forEach(rule => {
    const matches = content.match(rule.pattern);
    if (matches) {
      const newContent = content.replace(rule.pattern, rule.replacement);
      if (newContent !== content) {
        changes.push(`${rule.description}: ${matches.length} remplacement(s)`);
        totalReplacements += matches.length;
        content = newContent;
      }
    }
  });
  
  if (totalReplacements > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return { processed: totalReplacements, changes };
}

// Fichiers à traiter
const filesToProcess = [
  'src/components/chat/ChatBubbles.css',
  'src/components/chat/ChatMessage.css',
  'src/components/chat/ChatLayout.css',
  'src/components/chat/ChatSidebar.css',
  'src/styles/chat-markdown-typography.css',
  'src/styles/design-system.css',
  'src/styles/typography.css'
];

console.log('📄 Traitement des fichiers...\n');

let totalProcessed = 0;
filesToProcess.forEach(file => {
  console.log(`🔍 ${file}`);
  const result = processFile(file);
  
  if (result.processed > 0) {
    console.log(`  ✅ ${result.processed} correction(s) appliquée(s)`);
    result.changes.forEach(change => console.log(`    - ${change}`));
    totalProcessed += result.processed;
  } else {
    console.log(`  ⚪ Aucune correction nécessaire`);
  }
  console.log('');
});

console.log(`✨ Correction terminée ! ${totalProcessed} remplacement(s) au total.`);

// Vérifier les imports de polices
console.log('\n🔍 Vérification des imports de polices...');
const globalsFile = 'src/app/globals.css';
if (fs.existsSync(globalsFile)) {
  const content = fs.readFileSync(globalsFile, 'utf8');
  
  const requiredImports = [
    '@import url(\'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800;900&display=swap\');',
    '@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap\');',
    '@import url(\'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap\');'
  ];
  
  requiredImports.forEach(import_ => {
    if (content.includes(import_)) {
      console.log(`  ✅ ${import_.split('?')[0]}...`);
    } else {
      console.log(`  ❌ Import manquant: ${import_.split('?')[0]}...`);
    }
  });
}

console.log('\n🎯 Hiérarchie typographique corrigée !');
console.log('• 📝 Noto Sans: Titres (via var(--font-chat-headings))');
console.log('• 📝 Inter: Texte (via var(--font-chat-text))');
console.log('• 💻 JetBrains Mono: Code (via var(--font-mono))');
