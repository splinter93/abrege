#!/usr/bin/env node

/**
 * Script de test pour l'API Key Scrivia avec utilisateur spécifique
 * 1. Crée une API Key pour un utilisateur
 * 2. Teste l'authentification avec cette clé
 * 3. Vérifie que l'utilisateur est bien identifié
 */

const API_BASE_URL = 'https://scrivia.app/api/v2';

// Configuration de test
const TEST_USER_ID = 'test-user-123'; // Remplacez par un vrai user ID
const TEST_API_KEY_NAME = 'Test API Key';

async function testApiKeyWithUser() {
  console.log('🧪 Test de l\'API Key Scrivia avec utilisateur spécifique...\n');

  try {
    // Étape 1: Créer une API Key pour l'utilisateur
    console.log('🔑 Étape 1: Création d\'une API Key...');
    
    // Note: Cette étape nécessite d'être authentifié via OAuth ou JWT
    // car l'endpoint /api/v2/api-keys nécessite une authentification
    console.log('   ⚠️  Cette étape nécessite d\'être authentifié via OAuth/JWT');
    console.log('   💡 Utilisez d\'abord l\'interface web ou un autre endpoint pour créer une clé\n');

    // Étape 2: Simuler l'utilisation d'une API Key existante
    console.log('🔑 Étape 2: Test avec une API Key existante...');
    
    // Remplacez cette clé par une vraie clé générée
    const existingApiKey = 'scrivia_test_key_123'; // Clé de test
    
    console.log(`   Utilisation de la clé: ${existingApiKey}`);
    
    // Test avec l'API Key
    const testResponse = await fetch(`${API_BASE_URL}/folders`, {
      headers: {
        'X-API-Key': existingApiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${testResponse.status}`);
    
    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('   ✅ Succès! API Key fonctionne');
      console.log('   📊 Données reçues:', {
        success: data.success,
        foldersCount: data.folders?.length || 0
      });
    } else {
      const errorData = await testResponse.text();
      console.log('   ❌ Erreur:', errorData);
      
      if (testResponse.status === 401) {
        console.log('   💡 L\'API Key n\'est pas reconnue ou a expiré');
        console.log('   💡 Vérifiez que la clé existe dans la base de données');
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Instructions d'utilisation
console.log('📋 Instructions d\'utilisation:');
console.log('1. Assurez-vous que la base de données contient des API Keys');
console.log('2. Remplacez TEST_USER_ID par un vrai user ID');
console.log('3. Utilisez une vraie API Key dans existingApiKey');
console.log('4. Vérifiez que la table api_keys existe et contient des données\n');

// Lancer le test
testApiKeyWithUser();
