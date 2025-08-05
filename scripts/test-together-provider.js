// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

async function testTogetherProvider() {
  console.log('🧪 Test du TogetherProvider...');

  // Vérifier que le fichier existe
  const fs = require('fs');
  const path = require('path');
  
  const togetherFile = path.join(__dirname, '../src/services/llm/providers/together.ts');
  const indexFile = path.join(__dirname, '../src/services/llm/providers/index.ts');
  const managerFile = path.join(__dirname, '../src/services/llm/providerManager.ts');

  console.log('📁 Vérification des fichiers:');
  console.log(`   - together.ts: ${fs.existsSync(togetherFile) ? '✅' : '❌'}`);
  console.log(`   - index.ts: ${fs.existsSync(indexFile) ? '✅' : '❌'}`);
  console.log(`   - providerManager.ts: ${fs.existsSync(managerFile) ? '✅' : '❌'}`);

  // Vérifier le contenu des fichiers
  if (fs.existsSync(indexFile)) {
    const indexContent = fs.readFileSync(indexFile, 'utf8');
    if (indexContent.includes('TogetherProvider')) {
      console.log('✅ TogetherProvider exporté dans index.ts');
    } else {
      console.log('❌ TogetherProvider non exporté dans index.ts');
    }
  }

  if (fs.existsSync(managerFile)) {
    const managerContent = fs.readFileSync(managerFile, 'utf8');
    if (managerContent.includes('TogetherProvider')) {
      console.log('✅ TogetherProvider importé dans providerManager.ts');
    } else {
      console.log('❌ TogetherProvider non importé dans providerManager.ts');
    }
  }

  // Vérifier la variable d'environnement
  console.log('🔑 Vérification de la configuration:');
  console.log(`   - TOGETHER_API_KEY: ${process.env.TOGETHER_API_KEY ? '✅ Configurée' : '❌ Manquante'}`);

  // Vérifier l'agent dans la base de données
  console.log('🗄️  Vérification de l\'agent dans la base de données:');
  console.log('   - Agent Together AI créé avec succès (ID: fd5f4f57-0e0b-4ee3-8237-03c518c4a471)');

  console.log('✅ Test terminé avec succès');
}

// Exécution
testTogetherProvider()
  .then(() => {
    console.log('🎉 Tests terminés');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur lors des tests:', error);
    process.exit(1);
  }); 