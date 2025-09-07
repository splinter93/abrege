#!/usr/bin/env node

/**
 * Script de test pour vérifier les permissions des agents spécialisés
 * Teste que les agents ont maintenant les scopes nécessaires pour créer des notes
 */

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN; // Token JWT d'un utilisateur de test

async function testAgentPermissions() {
  console.log('🧪 TEST DES PERMISSIONS DES AGENTS SPÉCIALISÉS');
  console.log('================================================\n');

  if (!TEST_USER_TOKEN) {
    console.error('❌ TEST_USER_TOKEN manquant dans les variables d\'environnement');
    console.log('💡 Pour tester, définissez TEST_USER_TOKEN avec un token JWT valide');
    console.log('💡 Vous pouvez obtenir un token en vous connectant à l\'application et en regardant les logs');
    return;
  }

  try {
    // Test 1: Créer une note via l'API V2 avec le header d'agent spécialisé
    console.log('🔧 Test 1: Création de note avec header X-Agent-Type: specialized');
    
    const createNoteResponse = await fetch(`${BASE_URL}/api/v2/note/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm',
        'X-Agent-Type': 'specialized', // Header pour identifier l'agent spécialisé
        'Authorization': `Bearer ${TEST_USER_TOKEN}`
      },
      body: JSON.stringify({
        source_title: 'Test Agent Permissions',
        markdown_content: '# Test des permissions\n\nCeci est un test des permissions des agents spécialisés.',
        notebook_id: 'test' // Utiliser un classeur de test
      })
    });

    console.log(`📊 Status: ${createNoteResponse.status}`);
    
    if (createNoteResponse.ok) {
      const result = await createNoteResponse.json();
      console.log('✅ SUCCÈS: Note créée avec succès');
      console.log(`📋 Note ID: ${result.note?.id || 'N/A'}`);
      console.log(`📝 Titre: ${result.note?.source_title || 'N/A'}`);
    } else {
      const error = await createNoteResponse.text();
      console.log('❌ ÉCHEC: Erreur lors de la création');
      console.log(`🔍 Erreur: ${error}`);
      
      // Analyser l'erreur
      try {
        const errorJson = JSON.parse(error);
        if (errorJson.available_scopes && errorJson.available_scopes.length === 0) {
          console.log('\n🚨 PROBLÈME IDENTIFIÉ: available_scopes est vide');
          console.log('💡 Solution: Vérifiez que le header X-Agent-Type: specialized est bien traité');
        }
      } catch (e) {
        // Erreur n'est pas du JSON
      }
    }

    console.log('\n' + '='.repeat(50));

    // Test 2: Test sans le header d'agent (doit échouer)
    console.log('\n🔧 Test 2: Création de note SANS header X-Agent-Type (doit échouer)');
    
    const createNoteResponseNoHeader = await fetch(`${BASE_URL}/api/v2/note/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm',
        // Pas de X-Agent-Type
        'Authorization': `Bearer ${TEST_USER_TOKEN}`
      },
      body: JSON.stringify({
        source_title: 'Test Sans Agent Header',
        markdown_content: '# Test sans header agent\n\nCeci devrait échouer.',
        notebook_id: 'test'
      })
    });

    console.log(`📊 Status: ${createNoteResponseNoHeader.status}`);
    
    if (createNoteResponseNoHeader.ok) {
      console.log('⚠️ ATTENTION: La note a été créée sans le header agent (inattendu)');
    } else {
      const error = await createNoteResponseNoHeader.text();
      console.log('✅ ATTENDU: Erreur sans le header agent');
      console.log(`🔍 Erreur: ${error}`);
    }

    console.log('\n' + '='.repeat(50));

    // Test 3: Vérifier les scopes disponibles
    console.log('\n🔧 Test 3: Vérification des scopes disponibles');
    
    // Simuler l'authentification pour voir les scopes
    const authResponse = await fetch(`${BASE_URL}/api/v2/me`, {
      method: 'GET',
      headers: {
        'X-Client-Type': 'llm',
        'X-Agent-Type': 'specialized',
        'Authorization': `Bearer ${TEST_USER_TOKEN}`
      }
    });

    if (authResponse.ok) {
      const userInfo = await authResponse.json();
      console.log('✅ Informations utilisateur récupérées');
      console.log(`👤 User ID: ${userInfo.user?.id || 'N/A'}`);
      console.log(`📧 Email: ${userInfo.user?.email || 'N/A'}`);
    } else {
      console.log('❌ Impossible de récupérer les informations utilisateur');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }

  console.log('\n🎉 Test terminé');
}

// Exécuter le test
testAgentPermissions().catch(console.error);
