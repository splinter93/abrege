#!/usr/bin/env node

/**
 * Test de l'endpoint d'activité récente
 * Vérifie que /api/v2/notes/recent fonctionne correctement
 */

async function testActivityRecent() {
  console.log('🧪 Test de l\'endpoint d\'activité récente\n');

  // Test de l'endpoint GET
  try {
    console.log('📡 Test de l\'endpoint GET...');
    const response = await fetch('http://localhost:3000/api/v2/notes/recent');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Endpoint GET fonctionne');
      console.log(`📊 Notes récupérées: ${data.total}`);
      console.log(`🔧 API Version: ${data.metadata?.api_version}`);
      console.log(`⏰ Timestamp: ${data.metadata?.timestamp}`);
      
      if (data.notes && data.notes.length > 0) {
        console.log('\n📝 Première note:');
        console.log(`   - Titre: ${data.notes[0].title}`);
        console.log(`   - Slug: ${data.notes[0].slug}`);
        console.log(`   - Visibilité: ${data.notes[0].visibility}`);
        console.log(`   - Mise à jour: ${data.notes[0].updatedAt}`);
      }
    } else {
      console.log('❌ Endpoint GET échoué:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Erreur lors du test GET:', error.message);
  }

  // Test avec paramètre limit
  try {
    console.log('\n📡 Test avec paramètre limit=3...');
    const response = await fetch('http://localhost:3000/api/v2/notes/recent?limit=3');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test avec limit fonctionne');
      console.log(`📊 Notes récupérées: ${data.total}`);
      console.log(`🔧 Limit demandé: ${data.metadata?.limit}`);
    } else {
      console.log('❌ Test avec limit échoué:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Erreur lors du test avec limit:', error.message);
  }

  // Test avec paramètre username
  try {
    console.log('\n📡 Test avec paramètre username...');
    const response = await fetch('http://localhost:3000/api/v2/notes/recent?username=testuser');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test avec username fonctionne');
      console.log(`📊 Notes récupérées: ${data.total}`);
      console.log(`🔧 Username filtré: ${data.metadata?.username_filter}`);
    } else {
      console.log('❌ Test avec username échoué:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Erreur lors du test avec username:', error.message);
  }

  console.log('\n🏁 Test terminé');
}

// Exécuter le test
testActivityRecent().catch(console.error); 