/**
 * Script de test pour vérifier la configuration du serveur MCP Scrivia
 * Vérifie que le JWT est correctement injecté dans les headers
 */

import { mcpConfigService } from '../src/services/llm/mcpConfigService';

async function testMcpScriviaConfig() {
  console.log('🧪 Test de configuration MCP Scrivia\n');

  try {
    // Simuler un agentId et un userToken
    const testAgentId = 'test-agent-id';
    const testUserToken = 'test-jwt-token-123';
    
    // Outils OpenAPI de test
    const testOpenApiTools = [
      {
        type: 'function' as const,
        function: {
          name: 'test_tool',
          description: 'Outil de test',
          parameters: {}
        }
      }
    ];

    console.log('📋 Configuration de test:');
    console.log(`   Agent ID: ${testAgentId}`);
    console.log(`   User Token: ${testUserToken.substring(0, 20)}...`);
    console.log('');

    // Récupérer la configuration MCP pour l'agent
    const mcpConfig = await mcpConfigService.getAgentMcpConfig(testAgentId);
    
    if (!mcpConfig) {
      console.log('ℹ️  Aucun serveur MCP configuré pour cet agent de test');
      console.log('');
      console.log('💡 Pour tester avec un vrai agent:');
      console.log('   1. Créez ou sélectionnez un agent dans la base de données');
      console.log('   2. Liez-le au serveur MCP Scrivia via agent_mcp_servers');
      console.log('   3. Relancez ce script avec le bon agent_id');
      return;
    }

    console.log(`✅ Configuration MCP trouvée: ${mcpConfig.servers.length} serveur(s)`);
    console.log('');

    // Tester la construction des tools hybrides
    const hybridTools = await mcpConfigService.buildHybridTools(
      testAgentId,
      testUserToken,
      testOpenApiTools
    );

    console.log(`📦 Tools hybrides générés: ${hybridTools.length} au total`);
    console.log('');

    // Analyser les serveurs MCP
    const mcpServers = hybridTools.filter(t => t.type === 'mcp');
    const openApiToolsCount = hybridTools.filter(t => t.type === 'function').length;

    console.log(`   🔧 OpenAPI tools: ${openApiToolsCount}`);
    console.log(`   🌐 MCP servers: ${mcpServers.length}`);
    console.log('');

    // Vérifier l'injection du JWT
    let scriviaFound = false;
    for (const server of mcpServers) {
      if ('server_label' in server && 'headers' in server) {
        console.log(`📡 Serveur MCP: ${server.server_label}`);
        console.log(`   URL: ${server.server_url}`);
        
        if (server.headers) {
          console.log('   Headers:');
          for (const [key, value] of Object.entries(server.headers)) {
            const displayValue = value.includes('Bearer') 
              ? `Bearer ${testUserToken}... ✅ (JWT injecté)`
              : value;
            console.log(`      ${key}: ${displayValue}`);
            
            if (value === `Bearer ${testUserToken}`) {
              scriviaFound = true;
            }
          }
        }
        console.log('');
      }
    }

    if (scriviaFound) {
      console.log('✅ Le JWT a été correctement injecté dans le serveur MCP Scrivia !');
    } else {
      console.log('⚠️  Aucun serveur MCP Scrivia avec JWT injecté trouvé');
      console.log('   Vérifiez que le serveur est lié à l\'agent et que api_key = "{{USER_JWT}}"');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

// Exécuter le test
testMcpScriviaConfig();

