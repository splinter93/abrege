#!/usr/bin/env node

/**
 * Script de test pour valider l'implémentation des agents spécialisés
 * Teste les endpoints et la fonctionnalité complète
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

async function testOpenAPISchema() {
  log('\n🔍 Test du schéma OpenAPI...', 'blue');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/v2/openapi-schema`);
    
    if (response.status === 200) {
      log('✅ Schéma OpenAPI accessible', 'green');
      
      // Vérifier la structure du schéma
      if (response.data.openapi && response.data.paths) {
        log('✅ Structure OpenAPI valide', 'green');
        
        // Compter les endpoints d'agents spécialisés
        const agentEndpoints = Object.keys(response.data.paths).filter(path => 
          path.includes('/api/v2/agents/') && path !== '/api/v2/agents/'
        );
        
        log(`📊 ${agentEndpoints.length} endpoints d'agents spécialisés trouvés`, 'blue');
        
        return true;
      } else {
        log('❌ Structure OpenAPI invalide', 'red');
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

async function testAgentList() {
  log('\n🔍 Test de la liste des agents...', 'blue');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/ui/agents/specialized`);
    
    if (response.status === 200) {
      log('✅ Liste des agents accessible', 'green');
      
      if (response.data.success && Array.isArray(response.data.agents)) {
        log(`📊 ${response.data.agents.length} agents spécialisés trouvés`, 'blue');
        
        // Afficher les agents disponibles
        response.data.agents.forEach(agent => {
          log(`  - ${agent.display_name} (${agent.slug}) - ${agent.model}`, 'yellow');
        });
        
        return response.data.agents;
      } else {
        log('❌ Format de réponse invalide', 'red');
        return [];
      }
    } else {
      log(`❌ Erreur HTTP ${response.status}: ${response.data.error || 'Erreur inconnue'}`, 'red');
      return [];
    }
  } catch (error) {
    log(`❌ Erreur de connexion: ${error.message}`, 'red');
    return [];
  }
}

async function testAgentExecution(agentSlug) {
  log(`\n🔍 Test d'exécution de l'agent ${agentSlug}...`, 'blue');
  
  try {
    // Test avec un input simple
    const testInput = {
      query: 'Test de l\'agent spécialisé'
    };

    const response = await makeRequest(`${BASE_URL}/api/v2/agents/${agentSlug}`, {
      method: 'POST',
      body: testInput
    });
    
    if (response.status === 200) {
      log('✅ Agent exécuté avec succès', 'green');
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

async function testAgentInfo(agentSlug) {
  log(`\n🔍 Test des informations de l'agent ${agentSlug}...`, 'blue');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/v2/agents/${agentSlug}`);
    
    if (response.status === 200) {
      log('✅ Informations de l\'agent récupérées', 'green');
      log(`📝 Agent: ${response.data.name} (${response.data.slug})`, 'yellow');
      log(`📝 Modèle: ${response.data.model}`, 'yellow');
      log(`📝 Description: ${response.data.description}`, 'yellow');
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

async function testAgentCreation() {
  log('\n🔍 Test de création d\'un agent spécialisé...', 'blue');
  
  try {
    const newAgent = {
      slug: 'test-agent-' + Date.now(),
      display_name: 'Agent de Test',
      description: 'Agent créé par le script de test',
      model: 'openai/gpt-oss-20b',
      system_instructions: 'Tu es un agent de test créé automatiquement.',
      input_schema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message à traiter' }
        },
        required: ['message']
      },
      output_schema: {
        type: 'object',
        properties: {
          response: { type: 'string', description: 'Réponse de l\'agent' }
        }
      }
    };

    const response = await makeRequest(`${BASE_URL}/api/ui/agents/specialized`, {
      method: 'POST',
      body: newAgent
    });
    
    if (response.status === 200 && response.data.success) {
      log('✅ Agent créé avec succès', 'green');
      log(`📝 Endpoint: ${response.data.endpoint}`, 'yellow');
      return response.data.agent;
    } else {
      log(`❌ Erreur création: ${response.data.error || 'Erreur inconnue'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Erreur de connexion: ${error.message}`, 'red');
    return null;
  }
}

async function runTests() {
  log(`${colors.bold}🚀 Test de l'implémentation des agents spécialisés${colors.reset}`, 'blue');
  log(`📍 URL de test: ${BASE_URL}`, 'blue');
  
  const results = {
    openapi: false,
    agentList: false,
    agentCreation: false,
    agentExecution: false,
    agentInfo: false
  };

  // Test 1: Schéma OpenAPI
  results.openapi = await testOpenAPISchema();

  // Test 2: Liste des agents
  const agents = await testAgentList();
  results.agentList = agents.length > 0;

  // Test 3: Création d'un agent
  const newAgent = await testAgentCreation();
  results.agentCreation = newAgent !== null;

  // Test 4: Exécution d'un agent (utiliser un agent existant ou le nouveau)
  const agentToTest = newAgent || (agents.length > 0 ? agents[0] : null);
  if (agentToTest) {
    results.agentExecution = await testAgentExecution(agentToTest.slug);
    results.agentInfo = await testAgentInfo(agentToTest.slug);
  } else {
    log('⚠️ Aucun agent disponible pour les tests d\'exécution', 'yellow');
  }

  // Résumé des tests
  log('\n📊 Résumé des tests:', 'bold');
  log(`  OpenAPI Schema: ${results.openapi ? '✅' : '❌'}`, results.openapi ? 'green' : 'red');
  log(`  Liste des agents: ${results.agentList ? '✅' : '❌'}`, results.agentList ? 'green' : 'red');
  log(`  Création d'agent: ${results.agentCreation ? '✅' : '❌'}`, results.agentCreation ? 'green' : 'red');
  log(`  Exécution d'agent: ${results.agentExecution ? '✅' : '❌'}`, results.agentExecution ? 'green' : 'red');
  log(`  Informations d'agent: ${results.agentInfo ? '✅' : '❌'}`, results.agentInfo ? 'green' : 'red');

  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  if (successCount === totalTests) {
    log('\n🎉 Tous les tests sont passés avec succès !', 'green');
    process.exit(0);
  } else {
    log(`\n⚠️ ${successCount}/${totalTests} tests sont passés`, 'yellow');
    process.exit(1);
  }
}

// Exécuter les tests
runTests().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
