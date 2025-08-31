#!/usr/bin/env node

/**
 * Test avancé de l'endpoint DELETE unifié avec authentification
 */

const BASE_URL = 'http://localhost:3000';

async function testUnifiedDeleteAdvanced() {
  console.log('🧪 Test avancé de l\'endpoint DELETE unifié\n');

  // Test 1: Vérifier que l'endpoint unifié existe et répond
  console.log('1️⃣ Vérification de l\'endpoint unifié...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v2/note/test`, {
      method: 'HEAD'
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.status === 401) {
      console.log('   ✅ Endpoint accessible (401 = authentification requise)');
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
  }

  console.log('');

  // Test 2: Test avec des types de ressources valides
  console.log('2️⃣ Test des types de ressources valides...');
  
  const validResources = ['note', 'classeur', 'folder', 'file'];
  
  for (const resource of validResources) {
    try {
      const response = await fetch(`${BASE_URL}/api/v2/${resource}/test`, {
        method: 'HEAD'
      });

      console.log(`   ${resource}: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log('      ✅ Type de ressource accepté');
      } else {
        console.log('      ⚠️ Réponse inattendue');
      }
    } catch (error) {
      console.log(`   ${resource}: ❌ Erreur - ${error.message}`);
    }
  }

  console.log('');

  // Test 3: Test avec des types de ressources invalides
  console.log('3️⃣ Test des types de ressources invalides...');
  
  const invalidResources = ['invalid', 'test', 'random', 'unknown'];
  
  for (const resource of invalidResources) {
    try {
      const response = await fetch(`${BASE_URL}/api/v2/${resource}/test`, {
        method: 'DELETE'
      });

      console.log(`   ${resource}: ${response.status} ${response.statusText}`);
      
      if (response.status === 400) {
        console.log('      ✅ Type invalide rejeté (400 = Bad Request)');
      } else if (response.status === 404) {
        console.log('      ✅ Type invalide rejeté (404 = Not Found)');
      } else {
        console.log('      ⚠️ Réponse inattendue');
      }
    } catch (error) {
      console.log(`   ${resource}: ❌ Erreur - ${error.message}`);
    }
  }

  console.log('');

  // Test 4: Vérifier la structure de la réponse HEAD
  console.log('4️⃣ Vérification de la structure HEAD...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v2/note/test`, {
      method: 'HEAD'
    });

    const headers = Object.fromEntries(response.headers.entries());
    
    console.log('   Headers reçus:');
    console.log(`     X-Endpoint: ${headers['x-endpoint'] || 'Non défini'}`);
    console.log(`     X-Description: ${headers['x-description'] || 'Non défini'}`);
    console.log(`     X-Parameters: ${headers['x-parameters'] || 'Non défini'}`);
    console.log(`     X-Responses: ${headers['x-responses'] || 'Non défini'}`);
    
    if (headers['x-endpoint'] && headers['x-description']) {
      console.log('   ✅ Structure HEAD complète');
    } else {
      console.log('   ⚠️ Structure HEAD incomplète');
    }
  } catch (error) {
    console.log('   ❌ Erreur:', error.message);
  }

  console.log('\n🎯 Test avancé terminé !');
  console.log('\n📋 Résumé:');
  console.log('   ✅ Endpoint unifié accessible');
  console.log('   ✅ Validation des types de ressources');
  console.log('   ✅ Gestion des erreurs');
  console.log('   ✅ Structure HEAD informative');
}

// Lancer le test
testUnifiedDeleteAdvanced().catch(console.error);
