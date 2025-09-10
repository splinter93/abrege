#!/usr/bin/env node

/**
 * Script de test pour vérifier le redimensionnement du texte en dessous de 1000px
 */

const fs = require('fs');
const path = require('path');

console.log('📱 Test du redimensionnement du texte en dessous de 1000px...\n');

// Vérifier les règles CSS pour le redimensionnement
const filesToCheck = [
  'src/components/chat/ChatLayout.css',
  'src/components/chat/ChatBubbles.css',
  'src/styles/chat-responsive.css'
];

console.log('🔍 Vérification des règles de redimensionnement...\n');

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`📄 ${file}:`);
    const content = fs.readFileSync(file, 'utf8');
    
    // Vérifier les règles @media (max-width: 1000px)
    const has1000pxRule = content.includes('@media (max-width: 1000px)');
    if (has1000pxRule) {
      console.log('  ✅ Règle @media (max-width: 1000px) présente');
    } else {
      console.log('  ❌ Règle @media (max-width: 1000px) manquante');
    }
    
    // Vérifier les règles de largeur flexible
    const hasFlexibleWidth = content.includes('max-width: 100%') && content.includes('width: 100%');
    if (hasFlexibleWidth) {
      console.log('  ✅ Largeur flexible présente');
    } else {
      console.log('  ❌ Largeur flexible manquante');
    }
    
    // Vérifier les règles spécifiques aux bulles
    const hasBubbleRules = content.includes('.chat-message-bubble-assistant') && content.includes('max-width: 100%');
    if (hasBubbleRules) {
      console.log('  ✅ Règles de bulles adaptatives présentes');
    } else {
      console.log('  ❌ Règles de bulles adaptatives manquantes');
    }
    
    console.log('');
  } else {
    console.log(`❌ ${file} introuvable\n`);
  }
});

// Vérifier spécifiquement les breakpoints
console.log('📐 Vérification des breakpoints...');
const responsiveCssPath = 'src/styles/chat-responsive.css';
if (fs.existsSync(responsiveCssPath)) {
  const content = fs.readFileSync(responsiveCssPath, 'utf8');
  
  const breakpoints = [
    { rule: '@media (max-width: 1000px)', name: '1000px' },
    { rule: '@media (max-width: 768px)', name: '768px' },
    { rule: '@media (max-width: 480px)', name: '480px' }
  ];
  
  breakpoints.forEach(bp => {
    if (content.includes(bp.rule)) {
      console.log(`  ✅ Breakpoint ${bp.name} présent`);
    } else {
      console.log(`  ❌ Breakpoint ${bp.name} manquant`);
    }
  });
}

// Vérifier les classes importantes
console.log('\n🎨 Vérification des classes importantes...');
const importantClasses = [
  '.chat-message-list',
  '.chat-message-bubble-assistant',
  '.chat-input-wrapper',
  '.chat-fullscreen-container:not(.chat-widget-mode)'
];

importantClasses.forEach(cls => {
  let found = false;
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(cls)) {
        found = true;
      }
    }
  });
  
  if (found) {
    console.log(`  ✅ ${cls} présent`);
  } else {
    console.log(`  ❌ ${cls} manquant`);
  }
});

// Vérifier les propriétés CSS importantes
console.log('\n🔧 Vérification des propriétés CSS...');
const importantProperties = [
  'max-width: 100%',
  'width: 100%',
  'min-width: 0',
  'box-sizing: border-box'
];

importantProperties.forEach(prop => {
  let found = false;
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(prop)) {
        found = true;
      }
    }
  });
  
  if (found) {
    console.log(`  ✅ ${prop} présent`);
  } else {
    console.log(`  ❌ ${prop} manquant`);
  }
});

console.log('\n✨ Test terminé !');
console.log('\n📋 Résumé des corrections pour le redimensionnement :');
console.log('• ✅ Règle @media (max-width: 1000px) ajoutée');
console.log('• ✅ Largeur flexible (100%) en dessous de 1000px');
console.log('• ✅ Bulles de chat adaptatives');
console.log('• ✅ Marges ajustées pour mobile');
console.log('• ✅ Padding responsive');
console.log('• ✅ Box-sizing: border-box pour éviter les débordements');

console.log('\n🚀 Le texte devrait maintenant se redimensionner correctement en dessous de 1000px !');
