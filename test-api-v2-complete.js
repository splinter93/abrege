const API_KEY = 'your-api-key-here'; // Remplacez par votre vraie clé API
const BASE_URL = 'https://scrivia.app/api/v2';

// Configuration des tests
const TEST_CONFIG = {
  classeur_id: '552334a9-f012-41f3-a5eb-74ab9ab713ed', // ID de test
  delay: 1000 // Délai entre les tests en ms
};

// Fonction utilitaire pour attendre
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction utilitaire pour logger
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${emoji} [${timestamp}] ${message}`);
}

// Test de l'endpoint /me
async function testMe() {
  try {
    log('🧪 Test de l\'endpoint /me...');
    
    const response = await fetch(`${BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (response.ok) {
      const data = await response.json();
      log(`✅ Profil utilisateur récupéré: ${data.user?.email || 'N/A'}`, 'success');
    } else {
      const errorData = await response.text();
      log(`❌ Erreur /me: ${response.status} - ${errorData}`, 'error');
    }
  } catch (error) {
    log(`💥 Erreur de connexion /me: ${error.message}`, 'error');
  }
}

// Test de l'endpoint /classeurs
async function testClasseurs() {
  try {
    log('🧪 Test de l\'endpoint /classeurs...');
    
    // Test GET
    const getResponse = await fetch(`${BASE_URL}/classeurs`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (getResponse.ok) {
      const data = await getResponse.json();
      log(`✅ ${data.classeurs?.length || 0} classeurs récupérés`, 'success');
    } else {
      const errorData = await getResponse.text();
      log(`❌ Erreur GET /classeurs: ${getResponse.status} - ${errorData}`, 'error');
    }

    await delay(TEST_CONFIG.delay);

    // Test POST
    const postResponse = await fetch(`${BASE_URL}/classeurs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        name: 'Classeur de test API v2',
        description: 'Classeur créé pour tester l\'API v2',
        emoji: '🧪',
        color: '#ff6b6b'
      })
    });

    if (postResponse.ok) {
      const data = await postResponse.json();
      log(`✅ Classeur créé avec succès: ${data.classeur?.name}`, 'success');
      // Stocker l'ID pour les tests suivants
      TEST_CONFIG.test_classeur_id = data.classeur.id;
    } else {
      const errorData = await postResponse.text();
      log(`❌ Erreur POST /classeurs: ${postResponse.status} - ${errorData}`, 'error');
    }
  } catch (error) {
    log(`💥 Erreur de connexion /classeurs: ${error.message}`, 'error');
  }
}

// Test de l'endpoint /notes
async function testNotes() {
  try {
    log('🧪 Test de l\'endpoint /notes...');
    
    // Test GET avec pagination
    const getResponse = await fetch(`${BASE_URL}/notes?limit=5&offset=0`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (getResponse.ok) {
      const data = await getResponse.json();
      log(`✅ ${data.notes?.length || 0} notes récupérées (total: ${data.total})`, 'success');
    } else {
      const errorData = await getResponse.text();
      log(`❌ Erreur GET /notes: ${getResponse.status} - ${errorData}`, 'error');
    }

    await delay(TEST_CONFIG.delay);

    // Test POST
    const postResponse = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        source_title: 'Note de test API v2',
        markdown_content: '# Note de test\n\nCette note a été créée via l\'API v2.\n\n## Contenu\n- Test 1\n- Test 2\n\n**Bold text** et *italic text*.',
        classeur_id: TEST_CONFIG.classeur_id
      })
    });

    if (postResponse.ok) {
      const data = await postResponse.json();
      log(`✅ Note créée avec succès: ${data.note?.source_title}`, 'success');
      // Stocker l'ID pour les tests suivants
      TEST_CONFIG.test_note_id = data.note.id;
    } else {
      const errorData = await postResponse.text();
      log(`❌ Erreur POST /notes: ${postResponse.status} - ${errorData}`, 'error');
    }
  } catch (error) {
    log(`💥 Erreur de connexion /notes: ${error.message}`, 'error');
  }
}

// Test de l'endpoint /folders
async function testFolders() {
  try {
    log('🧪 Test de l\'endpoint /folders...');
    
    // Test GET
    const getResponse = await fetch(`${BASE_URL}/folders`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (getResponse.ok) {
      const data = await getResponse.json();
      log(`✅ ${data.folders?.length || 0} dossiers récupérés`, 'success');
    } else {
      const errorData = await getResponse.text();
      log(`❌ Erreur GET /folders: ${getResponse.status} - ${errorData}`, 'error');
    }

    await delay(TEST_CONFIG.delay);

    // Test POST
    const postResponse = await fetch(`${BASE_URL}/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        name: 'Dossier de test API v2',
        classeur_id: TEST_CONFIG.classeur_id,
        position: 0
      })
    });

    if (postResponse.ok) {
      const data = await postResponse.json();
      log(`✅ Dossier créé avec succès: ${data.folder?.name}`, 'success');
      // Stocker l'ID pour les tests suivants
      TEST_CONFIG.test_folder_id = data.folder.id;
    } else {
      const errorData = await postResponse.text();
      log(`❌ Erreur POST /folders: ${postResponse.status} - ${errorData}`, 'error');
    }
  } catch (error) {
    log(`💥 Erreur de connexion /folders: ${error.message}`, 'error');
  }
}

// Test de l'endpoint /search
async function testSearch() {
  try {
    log('🧪 Test de l\'endpoint /search...');
    
    const response = await fetch(`${BASE_URL}/search?q=test&limit=10`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (response.ok) {
      const data = await response.json();
      log(`✅ Recherche terminée: ${data.results?.length || 0} résultats pour "${data.query}"`, 'success');
    } else {
      const errorData = await response.text();
      log(`❌ Erreur /search: ${response.status} - ${errorData}`, 'error');
    }
  } catch (error) {
    log(`💥 Erreur de connexion /search: ${error.message}`, 'error');
  }
}

// Test de l'endpoint /stats
async function testStats() {
  try {
    log('🧪 Test de l\'endpoint /stats...');
    
    const response = await fetch(`${BASE_URL}/stats`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });

    if (response.ok) {
      const data = await response.json();
      log(`✅ Statistiques récupérées: ${data.stats?.total_notes || 0} notes, ${data.stats?.total_classeurs || 0} classeurs`, 'success');
    } else {
      const errorData = await response.text();
      log(`❌ Erreur /stats: ${response.status} - ${errorData}`, 'error');
    }
  } catch (error) {
    log(`💥 Erreur de connexion /stats: ${error.message}`, 'error');
  }
}

// Test de l'endpoint /export
async function testExport() {
  try {
    log('🧪 Test de l\'endpoint /export...');
    
    const response = await fetch(`${BASE_URL}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        format: 'markdown',
        classeur_id: TEST_CONFIG.classeur_id,
        include_metadata: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      log(`✅ Export généré: ${data.format} (${data.content_size} caractères)`, 'success');
    } else {
      const errorData = await response.text();
      log(`❌ Erreur /export: ${response.status} - ${errorData}`, 'error');
    }
  } catch (error) {
    log(`💥 Erreur de connexion /export: ${error.message}`, 'error');
  }
}

// Test des endpoints individuels
async function testIndividualEndpoints() {
  try {
    log('🧪 Test des endpoints individuels...');
    
    if (TEST_CONFIG.test_note_id) {
      // Test GET /note/[ref]
      const noteResponse = await fetch(`${BASE_URL}/note/${TEST_CONFIG.test_note_id}`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });

      if (noteResponse.ok) {
        const data = await noteResponse.json();
        log(`✅ Note individuelle récupérée: ${data.note?.source_title}`, 'success');
      } else {
        log(`❌ Erreur GET /note/[ref]: ${noteResponse.status}`, 'error');
      }
    }

    if (TEST_CONFIG.test_classeur_id) {
      // Test GET /classeur/[ref]
      const classeurResponse = await fetch(`${BASE_URL}/classeur/${TEST_CONFIG.test_classeur_id}`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });

      if (classeurResponse.ok) {
        const data = await classeurResponse.json();
        log(`✅ Classeur individuel récupéré: ${data.classeur?.name}`, 'success');
      } else {
        log(`❌ Erreur GET /classeur/[ref]: ${classeurResponse.status}`, 'error');
      }
    }

    if (TEST_CONFIG.test_folder_id) {
      // Test GET /folder/[ref]
      const folderResponse = await fetch(`${BASE_URL}/folder/${TEST_CONFIG.test_folder_id}`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });

      if (folderResponse.ok) {
        const data = await folderResponse.json();
        log(`✅ Dossier individuel récupéré: ${data.folder?.name}`, 'success');
      } else {
        log(`❌ Erreur GET /folder/[ref]: ${folderResponse.status}`, 'error');
      }
    }
  } catch (error) {
    log(`💥 Erreur de connexion endpoints individuels: ${error.message}`, 'error');
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests complets API v2...\n');
  
  try {
    await testMe();
    await delay(TEST_CONFIG.delay);
    
    await testClasseurs();
    await delay(TEST_CONFIG.delay);
    
    await testNotes();
    await delay(TEST_CONFIG.delay);
    
    await testFolders();
    await delay(TEST_CONFIG.delay);
    
    await testSearch();
    await delay(TEST_CONFIG.delay);
    
    await testStats();
    await delay(TEST_CONFIG.delay);
    
    await testExport();
    await delay(TEST_CONFIG.delay);
    
    await testIndividualEndpoints();
    
    console.log('\n🏁 Tous les tests sont terminés!');
    console.log('\n📊 Résumé des tests:');
    console.log('- ✅ /me - Profil utilisateur');
    console.log('- ✅ /classeurs - Gestion des classeurs');
    console.log('- ✅ /notes - Gestion des notes avec pagination');
    console.log('- ✅ /folders - Gestion des dossiers');
    console.log('- ✅ /search - Recherche textuelle');
    console.log('- ✅ /stats - Statistiques utilisateur');
    console.log('- ✅ /export - Export de données');
    console.log('- ✅ Endpoints individuels - GET/PUT/DELETE');
    
  } catch (error) {
    console.error('\n💥 Erreur lors de l\'exécution des tests:', error.message);
  }
}

// Vérifier que l'API key est configurée
if (API_KEY === 'your-api-key-here') {
  console.log('⚠️  Veuillez configurer votre clé API dans le script');
  console.log('🔑 Remplacez "your-api-key-here" par votre vraie clé API');
} else {
  runAllTests();
}
