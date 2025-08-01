#!/usr/bin/env node

/**
 * Script de test pour les endpoints de sessions de chat
 * Usage: node scripts/test-chat-sessions.js
 */

const BASE_URL = 'http://localhost:3001';

// Fonction utilitaire pour les requêtes
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  console.log(`\n🔄 ${options.method || 'GET'} ${url}`);
  if (options.body) {
    console.log('📦 Body:', JSON.stringify(options.body, null, 2));
  }

  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    
    console.log(`📡 Status: ${response.status}`);
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Tests des endpoints
async function runTests() {
  console.log('🧪 TESTS DES ENDPOINTS CHAT SESSIONS');
  console.log('=====================================');

  // Test 1: Créer une session
  console.log('\n📝 Test 1: Créer une session');
  const createResult = await makeRequest('/api/v1/chat-sessions', {
    method: 'POST',
    body: {
      name: 'Test Conversation',
      initial_message: 'Bonjour, c\'est un test !',
      metadata: { test: true }
    }
  });

  if (!createResult.success) {
    console.log('❌ Échec de la création de session');
    return;
  }

  const sessionId = createResult.data?.data?.id;
  console.log(`✅ Session créée avec l'ID: ${sessionId}`);

  // Test 2: Récupérer la session
  console.log('\n📖 Test 2: Récupérer la session');
  const getResult = await makeRequest(`/api/v1/chat-sessions/${sessionId}`);
  
  if (!getResult.success) {
    console.log('❌ Échec de la récupération de session');
    return;
  }

  console.log('✅ Session récupérée avec succès');

  // Test 3: Ajouter un message
  console.log('\n💬 Test 3: Ajouter un message');
  const addMessageResult = await makeRequest(`/api/v1/chat-sessions/${sessionId}/messages`, {
    method: 'POST',
    body: {
      role: 'user',
      content: 'Comment ça va ?'
    }
  });

  if (!addMessageResult.success) {
    console.log('❌ Échec de l\'ajout de message');
    return;
  }

  console.log('✅ Message ajouté avec succès');

  // Test 4: Récupérer les messages
  console.log('\n📋 Test 4: Récupérer les messages');
  const getMessagesResult = await makeRequest(`/api/v1/chat-sessions/${sessionId}/messages`);
  
  if (!getMessagesResult.success) {
    console.log('❌ Échec de la récupération des messages');
    return;
  }

  console.log('✅ Messages récupérés avec succès');
  console.log(`📊 Nombre de messages: ${getMessagesResult.data?.data?.messages?.length || 0}`);

  // Test 5: Mettre à jour la session
  console.log('\n✏️ Test 5: Mettre à jour la session');
  const updateResult = await makeRequest(`/api/v1/chat-sessions/${sessionId}`, {
    method: 'PUT',
    body: {
      name: 'Test Conversation Modifiée',
      metadata: { updated: true, test: true }
    }
  });

  if (!updateResult.success) {
    console.log('❌ Échec de la mise à jour de session');
    return;
  }

  console.log('✅ Session mise à jour avec succès');

  // Test 6: Lister toutes les sessions
  console.log('\n📚 Test 6: Lister toutes les sessions');
  const listResult = await makeRequest('/api/v1/chat-sessions');
  
  if (!listResult.success) {
    console.log('❌ Échec de la récupération des sessions');
    return;
  }

  console.log('✅ Sessions listées avec succès');
  console.log(`📊 Nombre de sessions: ${listResult.data?.data?.length || 0}`);

  // Test 7: Supprimer la session
  console.log('\n🗑️ Test 7: Supprimer la session');
  const deleteResult = await makeRequest(`/api/v1/chat-sessions/${sessionId}`, {
    method: 'DELETE'
  });

  if (!deleteResult.success) {
    console.log('❌ Échec de la suppression de session');
    return;
  }

  console.log('✅ Session supprimée avec succès');

  console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

// Exécuter les tests
runTests().catch(console.error); 