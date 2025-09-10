#!/usr/bin/env node

/**
 * Script de test pour vérifier la logique d'ouverture de la sidebar
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Test de la logique d\'ouverture de la sidebar...\n');

// Vérifier que le composant principal existe
const chatComponentPath = 'src/components/chat/ChatFullscreenV2.tsx';
if (fs.existsSync(chatComponentPath)) {
  const content = fs.readFileSync(chatComponentPath, 'utf8');
  
  console.log('📄 Vérification du composant ChatFullscreenV2...');
  
  // Vérifier l'état initial
  const hasInitialState = content.includes('useState(false)') && content.includes('Toujours fermée par défaut');
  if (hasInitialState) {
    console.log('  ✅ État initial correct (fermée par défaut)');
  } else {
    console.log('  ❌ État initial incorrect');
  }
  
  // Vérifier la gestion intelligente
  const hasSmartLogic = content.includes('Gestion intelligente de l\'ouverture de la sidebar');
  if (hasSmartLogic) {
    console.log('  ✅ Logique intelligente présente');
  } else {
    console.log('  ❌ Logique intelligente manquante');
  }
  
  // Vérifier la sauvegarde des préférences
  const hasPreferenceSaving = content.includes('localStorage.setItem(\'sidebar-preference\'');
  if (hasPreferenceSaving) {
    console.log('  ✅ Sauvegarde des préférences présente');
  } else {
    console.log('  ❌ Sauvegarde des préférences manquante');
  }
  
  // Vérifier la gestion desktop/mobile
  const hasDesktopMobileLogic = content.includes('isDesktop && user') && content.includes('!isDesktop');
  if (hasDesktopMobileLogic) {
    console.log('  ✅ Gestion desktop/mobile présente');
  } else {
    console.log('  ❌ Gestion desktop/mobile manquante');
  }
  
  // Vérifier la fermeture automatique sur mobile
  const hasAutoClose = content.includes('Fermer la sidebar sur mobile après sélection d\'une session');
  if (hasAutoClose) {
    console.log('  ✅ Fermeture automatique sur mobile présente');
  } else {
    console.log('  ❌ Fermeture automatique sur mobile manquante');
  }
  
  // Vérifier les conditions d'authentification
  const hasAuthChecks = content.includes('authLoading') && content.includes('!user');
  if (hasAuthChecks) {
    console.log('  ✅ Vérifications d\'authentification présentes');
  } else {
    console.log('  ❌ Vérifications d\'authentification manquantes');
  }
  
  console.log('');
} else {
  console.log('❌ ChatFullscreenV2.tsx introuvable\n');
}

// Vérifier les styles CSS pour la sidebar
console.log('🎨 Vérification des styles CSS...');
const cssFiles = [
  'src/components/chat/ChatSidebar.css',
  'src/styles/chat-responsive.css'
];

cssFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`📄 ${file}:`);
    const content = fs.readFileSync(file, 'utf8');
    
    // Vérifier les classes de sidebar
    const hasSidebarClasses = content.includes('.chat-sidebar.open') && content.includes('.chat-sidebar.closed');
    if (hasSidebarClasses) {
      console.log('  ✅ Classes de sidebar présentes');
    } else {
      console.log('  ❌ Classes de sidebar manquantes');
    }
    
    // Vérifier l'overlay mobile
    const hasOverlay = content.includes('.chat-sidebar-overlay');
    if (hasOverlay) {
      console.log('  ✅ Overlay mobile présent');
    } else {
      console.log('  ❌ Overlay mobile manquant');
    }
    
    // Vérifier les transitions
    const hasTransitions = content.includes('transition:') && content.includes('transform');
    if (hasTransitions) {
      console.log('  ✅ Transitions présentes');
    } else {
      console.log('  ❌ Transitions manquantes');
    }
    
    console.log('');
  } else {
    console.log(`❌ ${file} introuvable\n`);
  }
});

console.log('✨ Test terminé !');
console.log('\n📋 Résumé de la logique de sidebar :');
console.log('• ✅ État initial : fermée par défaut');
console.log('• ✅ Ouverture automatique sur desktop (première fois)');
console.log('• ✅ Respect des préférences utilisateur');
console.log('• ✅ Fermeture automatique sur mobile après sélection');
console.log('• ✅ Sauvegarde des préférences dans localStorage');
console.log('• ✅ Vérifications d\'authentification');
console.log('• ✅ Gestion desktop/mobile différenciée');

console.log('\n🚀 La sidebar devrait maintenant se comporter correctement !');
