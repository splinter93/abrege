console.log('🔍 Vérification de la configuration de l\'URL de base...');

// Vérifier les variables d'environnement
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
console.log('📡 NEXT_PUBLIC_API_BASE_URL:', apiBaseUrl || 'Non défini');

if (apiBaseUrl) {
  if (apiBaseUrl.includes('your-domain.vercel.app')) {
    console.log('❌ ATTENTION: URL de base utilise encore le placeholder!');
    console.log('💡 Corrigez NEXT_PUBLIC_API_BASE_URL dans vos variables d\'environnement');
  } else if (apiBaseUrl.includes('scrivia.app')) {
    console.log('✅ URL de base correctement configurée pour scrivia.app');
  } else {
    console.log('⚠️  URL de base:', apiBaseUrl);
  }
} else {
  console.log('⚠️  NEXT_PUBLIC_API_BASE_URL non défini');
  console.log('💡 Définissez cette variable dans vos variables d\'environnement');
}

// Vérifier les fichiers de configuration
const fs = require('fs');

try {
  const envExample = fs.readFileSync('env.example', 'utf8');
  if (envExample.includes('scrivia.app')) {
    console.log('✅ env.example correctement configuré');
  } else {
    console.log('❌ env.example contient encore des placeholders');
  }
} catch (error) {
  console.log('⚠️  Impossible de lire env.example');
}

console.log('🎉 Vérification terminée!'); 