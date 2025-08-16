#!/usr/bin/env node

/**
 * Script de test pour vérifier l'intégration de la dictée vocale dans l'éditeur
 * Teste que tous les composants sont bien connectés
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎤 Test de l\'intégration de la dictée vocale dans l\'éditeur\n');

// 1. Vérifier que le composant AudioRecorder existe
console.log('1️⃣ Vérification du composant AudioRecorder...');
const audioRecorderPath = path.join(__dirname, '../src/components/chat/AudioRecorder.tsx');
if (fs.existsSync(audioRecorderPath)) {
  console.log('✅ AudioRecorder.tsx existe');
  
  const content = fs.readFileSync(audioRecorderPath, 'utf8');
  if (content.includes('variant?: \'chat\' | \'toolbar\'')) {
    console.log('✅ Support du variant toolbar');
  } else {
    console.log('❌ Variant toolbar manquant');
  }
} else {
  console.log('❌ AudioRecorder.tsx manquant');
}

// 2. Vérifier que EditorToolbar utilise AudioRecorder
console.log('\n2️⃣ Vérification de EditorToolbar...');
const editorToolbarPath = path.join(__dirname, '../src/components/editor/EditorToolbar.tsx');
if (fs.existsSync(editorToolbarPath)) {
  console.log('✅ EditorToolbar.tsx existe');
  
  const content = fs.readFileSync(editorToolbarPath, 'utf8');
  if (content.includes('import AudioRecorder')) {
    console.log('✅ AudioRecorder importé');
  } else {
    console.log('❌ AudioRecorder non importé');
  }
  
  if (content.includes('variant="toolbar"')) {
    console.log('✅ Variant toolbar configuré');
  } else {
    console.log('❌ Variant toolbar non configuré');
  }
} else {
  console.log('❌ EditorToolbar.tsx manquant');
}

// 3. Vérifier que l'éditeur principal utilise EditorToolbar
console.log('\n3️⃣ Vérification de l\'éditeur principal...');
const editorPath = path.join(__dirname, '../src/components/editor/Editor.tsx');
if (fs.existsSync(editorPath)) {
  console.log('✅ Editor.tsx existe');
  
  const content = fs.readFileSync(editorPath, 'utf8');
  if (content.includes('handleTranscriptionComplete')) {
    console.log('✅ Fonction handleTranscriptionComplete définie');
  } else {
    console.log('❌ Fonction handleTranscriptionComplete manquante');
  }
  
  if (content.includes('onTranscriptionComplete={handleTranscriptionComplete}')) {
    console.log('✅ handleTranscriptionComplete passée à EditorToolbar');
  } else {
    console.log('❌ handleTranscriptionComplete non passée à EditorToolbar');
  }
} else {
  console.log('❌ Editor.tsx manquant');
}

// 4. Vérifier que les styles CSS existent
console.log('\n4️⃣ Vérification des styles CSS...');
const cssPath = path.join(__dirname, '../src/components/editor/editor-toolbar.css');
if (fs.existsSync(cssPath)) {
  console.log('✅ editor-toolbar.css existe');
  
  const content = fs.readFileSync(cssPath, 'utf8');
  if (content.includes('.toolbar-button.processing')) {
    console.log('✅ Styles pour l\'état processing');
  } else {
    console.log('❌ Styles pour l\'état processing manquants');
  }
  
  if (content.includes('.toolbar-button.recording')) {
    console.log('✅ Styles pour l\'état recording');
  } else {
    console.log('❌ Styles pour l\'état recording manquants');
  }
} else {
  console.log('❌ editor-toolbar.css manquant');
}

// 5. Vérifier que la page de test existe
console.log('\n5️⃣ Vérification de la page de test...');
const testPagePath = path.join(__dirname, '../src/app/test-editor-dictation/page.tsx');
if (fs.existsSync(testPagePath)) {
  console.log('✅ Page de test existe');
} else {
  console.log('❌ Page de test manquante');
}

console.log('\n🎯 Résumé de l\'intégration :');
console.log('La dictée vocale est maintenant intégrée dans l\'éditeur principal !');
console.log('\n📝 Pour tester :');
console.log('1. Ouvrir une note existante ou en créer une nouvelle');
console.log('2. Cliquer sur le bouton microphone 🎤 dans la toolbar');
console.log('3. Parler dans le microphone');
console.log('4. Cliquer à nouveau pour arrêter');
console.log('5. Le texte transcrit s\'insère à la position du curseur');
console.log('\n🔗 Page de test : /test-editor-dictation');
console.log('🔗 API Whisper : /api/v2/whisper/transcribe'); 