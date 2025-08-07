require('dotenv').config({ path: '.env.local' });

// Simulation de la fonction cleanAndParseFunctionArgs
function cleanAndParseFunctionArgs(rawArgs) {
  try {
    // Si c'est vide ou juste des espaces, retourner un objet vide
    if (!rawArgs || rawArgs.trim() === '' || rawArgs.trim() === '""' || rawArgs.trim() === "''") {
      console.log("✅ Arguments vides détectés, retour objet vide");
      return {};
    }
    
    // Essayer de parser directement
    return JSON.parse(rawArgs);
  } catch (error) {
    console.log("⚠️ Arguments JSON malformés, tentative de nettoyage:", rawArgs);
    
    try {
      // Nettoyer les arguments en supprimant les caractères problématiques
      let cleanedArgs = rawArgs
        .replace(/\n/g, '') // Supprimer les retours à la ligne
        .replace(/\r/g, '') // Supprimer les retours chariot
        .replace(/\t/g, '') // Supprimer les tabulations
        .trim();
      
      // Si c'est vide après nettoyage, retourner un objet vide
      if (!cleanedArgs || cleanedArgs === '""' || cleanedArgs === "''") {
        console.log("✅ Arguments vides après nettoyage, retour objet vide");
        return {};
      }
      
      // 🔧 NOUVEAU: Gestion des objets JSON multiples collés
      if (cleanedArgs.includes('}{')) {
        console.log("🔧 Détection d'objets JSON multiples, tentative de fusion");
        
        // Essayer de trouver tous les objets JSON et les fusionner
        const jsonObjects = [];
        let braceCount = 0;
        let startIndex = -1;
        
        for (let i = 0; i < cleanedArgs.length; i++) {
          if (cleanedArgs[i] === '{') {
            if (braceCount === 0) {
              startIndex = i;
            }
            braceCount++;
          } else if (cleanedArgs[i] === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
              const jsonObject = cleanedArgs.substring(startIndex, i + 1);
              try {
                const parsed = JSON.parse(jsonObject);
                jsonObjects.push(parsed);
              } catch (parseError) {
                console.log("⚠️ Impossible de parser un objet JSON:", jsonObject);
              }
              startIndex = -1;
            }
          }
        }
        
        // Fusionner tous les objets JSON trouvés
        if (jsonObjects.length > 0) {
          const mergedObject = jsonObjects.reduce((acc, obj) => ({ ...acc, ...obj }), {});
          console.log("✅ Objets JSON fusionnés avec succès:", mergedObject);
          return mergedObject;
        }
      }
      
      // Si on a plusieurs objets JSON concaténés, prendre le premier
      if (cleanedArgs.includes('}{')) {
        const firstBrace = cleanedArgs.indexOf('{');
        const lastBrace = cleanedArgs.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanedArgs = cleanedArgs.substring(firstBrace, lastBrace + 1);
        }
      }
      
      // Essayer de parser le JSON nettoyé
      const parsed = JSON.parse(cleanedArgs);
      console.log("✅ Arguments nettoyés avec succès:", parsed);
      return parsed;
      
    } catch (cleanError) {
      console.error("❌ Impossible de nettoyer les arguments JSON:", cleanError);
      throw new Error(`Arguments JSON invalides: ${rawArgs}`);
    }
  }
}

// Tests avec les cas problématiques
const testCases = [
  {
    name: 'Arguments malformés des logs',
    input: '{"notebook_id":"demo"}{"markdown_content":"Ceci est un contenu de test très beau !","notebook_id":"demo","source_title":"Wonderful"}',
    expected: {
      notebook_id: 'demo',
      markdown_content: 'Ceci est un contenu de test très beau !',
      source_title: 'Wonderful'
    }
  },
  {
    name: 'Arguments vides',
    input: '',
    expected: {}
  },
  {
    name: 'Arguments valides',
    input: '{"notebook_id":"demo","source_title":"Test"}',
    expected: {
      notebook_id: 'demo',
      source_title: 'Test'
    }
  }
];

console.log('🧪 Test de fusion d\'objets JSON multiples\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}:`);
  console.log(`   Input: ${testCase.input}`);
  
  try {
    const result = cleanAndParseFunctionArgs(testCase.input);
    console.log(`   Result:`, result);
    
    // Vérifier si le résultat correspond à l'attendu
    const isCorrect = JSON.stringify(result) === JSON.stringify(testCase.expected);
    console.log(`   Status: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ❌ FAIL`);
  }
  
  console.log('');
});

console.log('🎉 Test terminé !'); 