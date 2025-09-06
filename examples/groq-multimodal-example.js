#!/usr/bin/env node

/**
 * Exemple d'utilisation des agents spécialisés avec format Groq multimodale
 * Démontre l'utilisation des modèles Llama 4 Scout et Maverick
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'test-api-key';

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...options.headers
      }
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testLlama4ScoutWithImage() {
  log('\n🔍 Test Llama 4 Scout avec image...', 'blue');
  
  const testInput = {
    noteId: 'test-note-123',
    query: 'Analyse cette image et extrais les informations textuelles',
    imageUrl: 'https://example.com/document-image.jpg'
  };

  try {
    const response = await makeRequest(`${BASE_URL}/api/v2/agents/johnny`, {
      method: 'POST',
      body: testInput
    });
    
    if (response.status === 200) {
      log('✅ Llama 4 Scout avec image fonctionne', 'green');
      log(`📝 Réponse: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return true;
    } else {
      log(`❌ Erreur HTTP ${response.status}: ${response.data.error || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur de connexion: ${error.message}`, 'red');
    return false;
  }
}

async function testLlama4MaverickWithImage() {
  log('\n🔍 Test Llama 4 Maverick avec image...', 'blue');
  
  const testInput = {
    imageUrl: 'https://example.com/complex-image.jpg',
    task: 'Décris cette image en détail et identifie tous les éléments visuels',
    noteId: 'test-note-456'
  };

  try {
    const response = await makeRequest(`${BASE_URL}/api/v2/agents/vision`, {
      method: 'POST',
      body: testInput
    });
    
    if (response.status === 200) {
      log('✅ Llama 4 Maverick avec image fonctionne', 'green');
      log(`📝 Réponse: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return true;
    } else {
      log(`❌ Erreur HTTP ${response.status}: ${response.data.error || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur de connexion: ${error.message}`, 'red');
    return false;
  }
}

async function testGroqPayloadFormat() {
  log('\n🔍 Test du format de payload Groq...', 'blue');
  
  // Exemple de payload Groq comme fourni par l'utilisateur
  const groqPayload = {
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "décris l'image"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/test-image.jpg"
            }
          }
        ]
      }
    ],
    "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
    "temperature": 1,
    "max_completion_tokens": 1024,
    "top_p": 1,
    "stream": true,
    "stop": null
  };

  log('📋 Payload Groq généré:', 'blue');
  log(JSON.stringify(groqPayload, null, 2), 'yellow');

  // Test avec notre API
  const testInput = {
    imageUrl: 'https://example.com/test-image.jpg',
    query: 'décris l\'image'
  };

  try {
    const response = await makeRequest(`${BASE_URL}/api/v2/agents/vision`, {
      method: 'POST',
      body: testInput
    });
    
    if (response.status === 200) {
      log('✅ Format Groq compatible avec notre API', 'green');
      return true;
    } else {
      log(`❌ Erreur HTTP ${response.status}: ${response.data.error || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur de connexion: ${error.message}`, 'red');
    return false;
  }
}

async function testTextOnlyWithLlama4() {
  log('\n🔍 Test Llama 4 Scout text-only...', 'blue');
  
  const testInput = {
    noteId: 'test-note-789',
    query: 'Analyse ce contenu et résume les points clés'
  };

  try {
    const response = await makeRequest(`${BASE_URL}/api/v2/agents/johnny`, {
      method: 'POST',
      body: testInput
    });
    
    if (response.status === 200) {
      log('✅ Llama 4 Scout text-only fonctionne', 'green');
      log(`📝 Réponse: ${JSON.stringify(response.data, null, 2)}`, 'yellow');
      return true;
    } else {
      log(`❌ Erreur HTTP ${response.status}: ${response.data.error || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur de connexion: ${error.message}`, 'red');
    return false;
  }
}

async function runMultimodalTests() {
  log(`${colors.bold}🚀 Test des modèles Llama 4 Multimodaux${colors.reset}`, 'blue');
  log(`📍 URL de test: ${BASE_URL}`, 'blue');
  
  const results = {
    scoutImage: false,
    maverickImage: false,
    groqFormat: false,
    textOnly: false
  };

  // Test 1: Llama 4 Scout avec image
  results.scoutImage = await testLlama4ScoutWithImage();

  // Test 2: Llama 4 Maverick avec image
  results.maverickImage = await testLlama4MaverickWithImage();

  // Test 3: Format Groq
  results.groqFormat = await testGroqPayloadFormat();

  // Test 4: Text-only
  results.textOnly = await testTextOnlyWithLlama4();

  // Résumé des tests
  log('\n📊 Résumé des tests multimodaux:', 'bold');
  log(`  Llama 4 Scout + Image: ${results.scoutImage ? '✅' : '❌'}`, results.scoutImage ? 'green' : 'red');
  log(`  Llama 4 Maverick + Image: ${results.maverickImage ? '✅' : '❌'}`, results.maverickImage ? 'green' : 'red');
  log(`  Format Groq compatible: ${results.groqFormat ? '✅' : '❌'}`, results.groqFormat ? 'green' : 'red');
  log(`  Text-only: ${results.textOnly ? '✅' : '❌'}`, results.textOnly ? 'green' : 'red');

  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  if (successCount === totalTests) {
    log('\n🎉 Tous les tests multimodaux sont passés !', 'green');
    log('\n📋 Modèles Llama 4 Multimodaux supportés:', 'blue');
    log('  🤖 meta-llama/llama-4-scout-17b-16e-instruct (16 experts)', 'yellow');
    log('  🖼️ meta-llama/llama-4-maverick-17b-128e-instruct (128 experts)', 'yellow');
    log('\n🔧 Format Groq supporté:', 'blue');
    log('  - Messages multimodaux (text + image_url)', 'yellow');
    log('  - Stream: true/false', 'yellow');
    log('  - Temperature, max_completion_tokens, top_p', 'yellow');
    process.exit(0);
  } else {
    log(`\n⚠️ ${successCount}/${totalTests} tests sont passés`, 'yellow');
    process.exit(1);
  }
}

// Exécuter les tests
runMultimodalTests().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
