// Test direct de l'authentification
const { getAuthenticatedUser } = require('./src/utils/authUtils');

// Configuration des variables d'environnement pour le test
process.env.SCRIVIA_API_KEYS = 'scrivia-api-key-2024,scrivia-test-key,scrivia-dev-key';
process.env.SCRIVIA_DEFAULT_USER_ID = 'test-user-id-12345';

async function testAuthDebug() {
  console.log('🧪 Test de debug de l\'authentification...\n');
  
  console.log('📋 Variables d\'environnement:');
  console.log(`   SCRIVIA_API_KEYS: ${process.env.SCRIVIA_API_KEYS}`);
  console.log(`   SCRIVIA_DEFAULT_USER_ID: ${process.env.SCRIVIA_DEFAULT_USER_ID}`);
  console.log('');

  try {
    // Simuler une requête avec clé d'API
    const mockRequest = {
      headers: {
        get: (name) => {
          if (name === 'X-API-Key') return 'scrivia-api-key-2024';
          if (name === 'Authorization') return null;
          return null;
        }
      }
    };

    console.log('🔍 Test de getAuthenticatedUser avec clé d\'API...');
    const result = await getAuthenticatedUser(mockRequest);
    
    console.log('📊 Résultat:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Authentification réussie !');
      console.log(`   User ID: ${result.userId}`);
      console.log(`   Auth Type: ${result.authType}`);
      console.log(`   Scopes: ${result.scopes?.length || 0} scopes`);
    } else {
      console.log('\n❌ Authentification échouée');
      console.log(`   Erreur: ${result.error}`);
    }

  } catch (error) {
    console.error('\n💥 Erreur lors du test:', error.message);
    console.error(error.stack);
  }
}

// Exécuter le test
testAuthDebug();
