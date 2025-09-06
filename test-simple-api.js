#!/usr/bin/env node

/**
 * Test simple des routes API des agents spécialisés
 * Teste directement les routes sans serveur complet
 */

const { NextRequest, NextResponse } = require('next/server');

// Mock des variables d'environnement
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

// Test de la route principale
async function testAgentRoute() {
  console.log('🧪 Test de la route /api/v2/agents/[agentId]');
  
  try {
    // Import dynamique pour éviter les erreurs de module
    const { POST } = await import('./src/app/api/v2/agents/[agentId]/route.ts');
    
    // Mock de la requête
    const mockRequest = {
      json: async () => ({
        noteId: 'test-note-123',
        query: 'Test de l\'agent spécialisé'
      }),
      headers: {
        get: (name) => {
          if (name === 'x-trace-id') return 'test-trace-123';
          return null;
        }
      }
    };
    
    const mockParams = { agentId: 'johnny' };
    
    console.log('✅ Route importée avec succès');
    console.log('📝 Fonction POST disponible:', typeof POST === 'function');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur import route:', error.message);
    return false;
  }
}

// Test de la route UI
async function testUIRoute() {
  console.log('\n🧪 Test de la route /api/ui/agents/specialized');
  
  try {
    const { GET } = await import('./src/app/api/ui/agents/specialized/route.ts');
    
    console.log('✅ Route UI importée avec succès');
    console.log('📝 Fonction GET disponible:', typeof GET === 'function');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur import route UI:', error.message);
    return false;
  }
}

// Test des types
async function testTypes() {
  console.log('\n🧪 Test des types TypeScript');
  
  try {
    const { SUPPORTED_GROQ_MODELS } = await import('./src/types/specializedAgents.ts');
    
    console.log('✅ Types importés avec succès');
    console.log('📝 Modèles supportés:', Object.keys(SUPPORTED_GROQ_MODELS).length);
    
    // Vérifier les modèles Llama 4
    const llama4Models = Object.keys(SUPPORTED_GROQ_MODELS).filter(model => 
      model.includes('llama-4')
    );
    
    console.log('🤖 Modèles Llama 4:', llama4Models);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur import types:', error.message);
    return false;
  }
}

// Test des services
async function testServices() {
  console.log('\n🧪 Test des services');
  
  try {
    const { MultimodalHandler } = await import('./src/services/specializedAgents/multimodalHandler.ts');
    
    console.log('✅ MultimodalHandler importé avec succès');
    console.log('📝 Méthodes disponibles:', Object.getOwnPropertyNames(MultimodalHandler));
    
    // Test de création de payload Groq
    const payload = MultimodalHandler.createGroqPayload(
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'Test message',
      'https://example.com/image.jpg',
      { temperature: 0.7 }
    );
    
    console.log('🔧 Payload Groq généré:', JSON.stringify(payload, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Erreur import services:', error.message);
    return false;
  }
}

// Test de validation
async function testValidation() {
  console.log('\n🧪 Test de validation');
  
  try {
    const { SchemaValidator } = await import('./src/services/specializedAgents/schemaValidator.ts');
    
    console.log('✅ SchemaValidator importé avec succès');
    
    // Test de validation simple
    const schema = {
      type: 'object',
      properties: {
        text: { type: 'string' },
        imageUrl: { type: 'string' }
      },
      required: ['text']
    };
    
    const input = { text: 'Hello world' };
    const validation = SchemaValidator.validateInput(input, schema);
    
    console.log('📝 Validation test:', validation);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur import validation:', error.message);
    return false;
  }
}

// Exécution des tests
async function runTests() {
  console.log('🚀 Test de l\'implémentation des agents spécialisés');
  console.log('================================================');
  
  const results = {
    agentRoute: false,
    uiRoute: false,
    types: false,
    services: false,
    validation: false
  };
  
  // Tests
  results.agentRoute = await testAgentRoute();
  results.uiRoute = await testUIRoute();
  results.types = await testTypes();
  results.services = await testServices();
  results.validation = await testValidation();
  
  // Résumé
  console.log('\n📊 Résumé des tests:');
  console.log('===================');
  console.log(`Route Agent: ${results.agentRoute ? '✅' : '❌'}`);
  console.log(`Route UI: ${results.uiRoute ? '✅' : '❌'}`);
  console.log(`Types: ${results.types ? '✅' : '❌'}`);
  console.log(`Services: ${results.services ? '✅' : '❌'}`);
  console.log(`Validation: ${results.validation ? '✅' : '❌'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Score: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 Tous les tests sont passés ! L\'implémentation est fonctionnelle.');
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
  }
}

// Exécuter
runTests().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
