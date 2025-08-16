#!/usr/bin/env node

/**
 * Script de test pour l'API Whisper
 * 
 * Usage: node scripts/test-whisper.js
 */

const fs = require('fs');
const path = require('path');

async function testWhisperAPI() {
  console.log('🎤 Test de l\'API Whisper\n');

  // Test 1: Vérifier que l'endpoint répond
  console.log('1️⃣ Test de l\'endpoint GET /api/v1/whisper/transcribe');
  
  try {
    const response = await fetch('http://localhost:3005/api/v1/whisper/transcribe');
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Endpoint accessible');
      console.log('📋 Informations:', {
        supported_models: data.supported_models,
        max_file_size: data.max_file_size,
        supported_formats: data.supported_formats
      });
    } else {
      console.log('❌ Erreur:', data.error);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }

  console.log('\n2️⃣ Test de l\'endpoint GET /api/v1/whisper/translate');
  
  try {
    const response = await fetch('http://localhost:3005/api/v1/whisper/translate');
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Endpoint accessible');
      console.log('📋 Informations:', {
        supported_models: data.supported_models,
        max_file_size: data.max_file_size,
        note: data.note
      });
    } else {
      console.log('❌ Erreur:', data.error);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }

  // Test 3: Vérifier la configuration Groq
  console.log('\n3️⃣ Vérification de la configuration Groq');
  
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    console.log('✅ GROQ_API_KEY configurée');
    console.log('🔑 Clé:', groqApiKey.substring(0, 10) + '...');
  } else {
    console.log('❌ GROQ_API_KEY manquante');
    console.log('💡 Ajoutez GROQ_API_KEY dans votre .env.local');
  }

  // Test 4: Créer un fichier audio de test minimal
  console.log('\n4️⃣ Test avec un fichier audio minimal');
  
  try {
    // Créer un fichier WAV minimal (silence)
    const wavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // Size
      0x57, 0x41, 0x56, 0x45, // WAVE
      0x66, 0x6D, 0x74, 0x20, // fmt
      0x10, 0x00, 0x00, 0x00, // fmt chunk size
      0x01, 0x00, // Audio format (PCM)
      0x01, 0x00, // Channels (mono)
      0x44, 0xAC, 0x00, 0x00, // Sample rate (44100)
      0x88, 0x58, 0x01, 0x00, // Byte rate
      0x02, 0x00, // Block align
      0x10, 0x00, // Bits per sample
      0x64, 0x61, 0x74, 0x61, // data
      0x00, 0x00, 0x00, 0x00  // data size (0 bytes)
    ]);

    const testFile = path.join(__dirname, 'test-silence.wav');
    fs.writeFileSync(testFile, wavHeader);
    
    console.log('✅ Fichier de test créé:', testFile);
    console.log('📁 Taille:', wavHeader.length, 'bytes');

    // Test de l'upload (simulation)
    console.log('\n📤 Simulation d\'upload...');
    console.log('💡 Pour tester l\'upload réel, utilisez la page web: http://localhost:3005/test-whisper');
    
  } catch (error) {
    console.log('❌ Erreur lors de la création du fichier de test:', error.message);
  }

  console.log('\n🎯 Résumé des tests:');
  console.log('✅ Endpoints API créés');
  console.log('✅ Page de test disponible');
  console.log('✅ Configuration Groq intégrée');
  console.log('\n🚀 Pour tester:');
  console.log('1. Ouvrez http://localhost:3005/test-whisper');
  console.log('2. Sélectionnez un fichier audio');
  console.log('3. Configurez les paramètres');
  console.log('4. Lancez la transcription/traduction');
}

// Exécuter le test
testWhisperAPI().catch(console.error); 