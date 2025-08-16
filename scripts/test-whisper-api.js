#!/usr/bin/env node

/**
 * Test de l'API Whisper
 * Vérifie que l'endpoint /api/v1/whisper/transcribe fonctionne
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

async function testWhisperAPI() {
  console.log('🧪 Test de l\'API Whisper\n');

  // Vérifier la clé API
  if (!process.env.GROQ_API_KEY) {
    console.log('❌ GROQ_API_KEY non configurée');
    console.log('💡 Ajoutez GROQ_API_KEY dans votre .env.local');
    return;
  }

  console.log('✅ GROQ_API_KEY configurée');

  // Test de l'endpoint GET
  try {
    console.log('\n📡 Test de l\'endpoint GET...');
    const response = await fetch('http://localhost:3000/api/v1/whisper/transcribe');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Endpoint GET fonctionne:', data);
    } else {
      console.log('❌ Endpoint GET échoué:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Erreur lors du test GET:', error.message);
  }

  // Test de l'endpoint POST avec un fichier audio factice
  try {
    console.log('\n📡 Test de l\'endpoint POST...');
    
    // Créer un fichier audio factice (1 seconde de silence)
    const audioData = Buffer.alloc(1024); // 1KB de données factices
    const tempFile = path.join(__dirname, 'temp-audio.webm');
    fs.writeFileSync(tempFile, audioData);

    const formData = new FormData();
    const file = new File([audioData], 'test.webm', { type: 'audio/webm' });
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'text');
    formData.append('temperature', '0');

    const response = await fetch('http://localhost:3000/api/v1/whisper/transcribe', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Endpoint POST fonctionne:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Endpoint POST échoué:', response.status, response.statusText);
      console.log('Détails:', errorText);
    }

    // Nettoyer le fichier temporaire
    fs.unlinkSync(tempFile);

  } catch (error) {
    console.log('❌ Erreur lors du test POST:', error.message);
  }

  console.log('\n🏁 Test terminé');
}

// Exécuter le test
testWhisperAPI().catch(console.error); 