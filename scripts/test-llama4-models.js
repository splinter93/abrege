#!/usr/bin/env node

/**
 * Script de test spécifique pour les modèles Llama 4 sur Groq
 * Teste les nouveaux modèles meta-llama/llama-4-*
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

async function testLlama4Scout() {
  log('\n🔍 Test du modèle Llama 4 Scout (text-only)...', 'blue');
  
  try {
    // Test avec un agent utilisant Llama 4 Scout
    const testInput = {
      noteId: 'test-note-123',
      query: 'Analyse ce contenu et explique les points clés de manière structurée'
    };

    const response = await makeRequest(`${BASE_URL}/api/v2/agents/johnny`, {
      method: 'POST',
      body: testInput
    });
    
    if (response.status === 200) {
      log('✅ Llama 4 Scout fonctionne correctement', 'green');
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

async function testLlama4Maverick() {
  log('\n🔍 Test du modèle Llama 4 Maverick (multimodal)...', 'blue');
  
  try {
    // Test avec un agent utilisant Llama 4 Maverick
    const testInput = {
      imageUrl: 'https://example.com/test-image.jpg',
      task: 'Analyse cette image et extrais les informations textuelles'
    };

    const response = await makeRequest(`${BASE_URL}/api/v2/agents/vision`, {
      method: 'POST',
      body: testInput
    });
    
    if (response.status === 200) {
      log('✅ Llama 4 Maverick fonctionne correctement', 'green');
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

async function testModelCapabilities() {
  log('\n🔍 Test des capacités des modèles...', 'blue');
  
  try {
    // Récupérer la liste des agents pour vérifier les modèles
    const response = await makeRequest(`${BASE_URL}/api/ui/agents/specialized`);
    
    if (response.status === 200 && response.data.success) {
      const agents = response.data.agents;
      log(`📊 ${agents.length} agents spécialisés trouvés`, 'blue');
      
      // Vérifier les modèles Llama 4
      const llama4Agents = agents.filter(agent => 
        agent.model.includes('llama-4')
      );
      
      if (llama4Agents.length > 0) {
        log('✅ Agents Llama 4 détectés:', 'green');
        llama4Agents.forEach(agent => {
          log(`  - ${agent.display_name} (${agent.model})`, 'yellow');
        });
        return true;
      } else {
        log('⚠️ Aucun agent Llama 4 trouvé', 'yellow');
        return false;
      }
    } else {
      log(`❌ Erreur récupération agents: ${response.data.error || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur de connexion: ${error.message}`, 'red');
    return false;
  }
}

async function testOpenAPISchema() {
  log('\n🔍 Test du schéma OpenAPI avec les modèles Llama 4...', 'blue');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/v2/openapi-schema`);
    
    if (response.status === 200) {
      log('✅ Schéma OpenAPI accessible', 'green');
      
      // Vérifier que les endpoints Llama 4 sont documentés
      const schema = response.data;
      const paths = Object.keys(schema.paths || {});
      const llama4Endpoints = paths.filter(path => 
        path.includes('/api/v2/agents/') && 
        (path.includes('johnny') || path.includes('vision'))
      );
      
      if (llama4Endpoints.length > 0) {
        log(`✅ ${llama4Endpoints.length} endpoints Llama 4 documentés`, 'green');
        return true;
      } else {
        log('⚠️ Endpoints Llama 4 non trouvés dans la documentation', 'yellow');
        return false;
      }
    } else {
      log(`❌ Erreur HTTP ${response.status}: ${response.data.error || 'Erreur inconnue'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erreur de connexion: ${error.message}`, 'red');
    return false;
  }
}

async function runLlama4Tests() {
  log(`${colors.bold}🚀 Test des modèles Llama 4 sur Groq${colors.reset}`, 'blue');
  log(`📍 URL de test: ${BASE_URL}`, 'blue');
  
  const results = {
    scout: false,
    maverick: false,
    capabilities: false,
    openapi: false
  };

  // Test 1: Llama 4 Scout (text-only)
  results.scout = await testLlama4Scout();

  // Test 2: Llama 4 Maverick (multimodal)
  results.maverick = await testLlama4Maverick();

  // Test 3: Capacités des modèles
  results.capabilities = await testModelCapabilities();

  // Test 4: Documentation OpenAPI
  results.openapi = await testOpenAPISchema();

  // Résumé des tests
  log('\n📊 Résumé des tests Llama 4:', 'bold');
  log(`  Llama 4 Scout (text-only): ${results.scout ? '✅' : '❌'}`, results.scout ? 'green' : 'red');
  log(`  Llama 4 Maverick (multimodal): ${results.maverick ? '✅' : '❌'}`, results.maverick ? 'green' : 'red');
  log(`  Capacités des modèles: ${results.capabilities ? '✅' : '❌'}`, results.capabilities ? 'green' : 'red');
  log(`  Documentation OpenAPI: ${results.openapi ? '✅' : '❌'}`, results.openapi ? 'green' : 'red');

  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  if (successCount === totalTests) {
    log('\n🎉 Tous les tests Llama 4 sont passés avec succès !', 'green');
    log('\n📋 Modèles Llama 4 supportés:', 'blue');
    log('  🤖 meta-llama/llama-4-scout-17b-16e-instruct (Text-only)', 'yellow');
    log('  🖼️ meta-llama/llama-4-maverick-17b-128e-instruct (Multimodal)', 'yellow');
    process.exit(0);
  } else {
    log(`\n⚠️ ${successCount}/${totalTests} tests sont passés`, 'yellow');
    process.exit(1);
  }
}

// Exécuter les tests
runLlama4Tests().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
