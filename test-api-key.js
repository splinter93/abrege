#!/usr/bin/env node

/**
 * Script de test pour l'API Key Scrivia
 * Teste l'authentification via X-API-Key header
 */

const API_BASE_URL = 'https://scrivia.app/api/v2';
const API_KEY = 'scrivia-api-key-2024'; // Clé de test

async function testApiKey() {
  console.log('🧪 Test de l\'API Key Scrivia...\n');

  try {
    // Test 1: Lister les dossiers avec API Key
    console.log('📁 Test 1: Lister les dossiers...');
    const foldersResponse = await fetch(`${API_BASE_URL}/folders`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${foldersResponse.status}`);
    
    if (foldersResponse.ok) {
      const foldersData = await foldersResponse.json();
      console.log('   ✅ Succès! Dossiers récupérés:', foldersData.folders?.length || 0);
    } else {
      const errorData = await foldersResponse.text();
      console.log('   ❌ Erreur:', errorData);
    }

    console.log('');

    // Test 2: Lister les classeurs avec API Key
    console.log('📚 Test 2: Lister les classeurs...');
    const classeursResponse = await fetch(`${API_BASE_URL}/classeurs`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${classeursResponse.status}`);
    
    if (classeursResponse.ok) {
      const classeursData = await classeursResponse.json();
      console.log('   ✅ Succès! Classeurs récupérés:', classeursData.classeurs?.length || 0);
    } else {
      const errorData = await classeursResponse.text();
      console.log('   ❌ Erreur:', errorData);
    }

    console.log('');

    // Test 3: Lister les notes avec API Key
    console.log('📝 Test 3: Lister les notes...');
    const notesResponse = await fetch(`${API_BASE_URL}/notes`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${notesResponse.status}`);
    
    if (notesResponse.ok) {
      const notesData = await notesResponse.json();
      console.log('   ✅ Succès! Notes récupérées:', notesData.notes?.length || 0);
    } else {
      const errorData = await notesResponse.text();
      console.log('   ❌ Erreur:', errorData);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Lancer le test
testApiKey();
