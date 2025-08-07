require('dotenv').config({ path: '.env.local' });

// Simulation des descriptions simplifiées
const simplifiedTools = [
  {
    name: 'create_note',
    description: 'Créer une nouvelle note. IMPORTANT: Fournir UN SEUL objet JSON avec les paramètres suivants.',
    parameters: {
      type: 'object',
      properties: {
        source_title: {
          type: 'string',
          description: 'Titre de la note (obligatoire)'
        },
        notebook_id: {
          type: 'string',
          description: 'ID ou slug du classeur (obligatoire)'
        },
        markdown_content: {
          type: 'string',
          description: 'Contenu markdown de la note (optionnel)'
        }
      },
      required: ['source_title', 'notebook_id']
    }
  },
  {
    name: 'get_notebooks',
    description: 'Récupérer la liste des classeurs. IMPORTANT: Cette fonction ne prend aucun paramètre, mais vous devez toujours fournir un objet JSON vide {} comme arguments.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Simulation des descriptions complexes (anciennes)
const complexTools = [
  {
    name: 'create_note',
    description: 'Créer une nouvelle note structurée dans un classeur spécifique (par ID ou slug), avec un titre obligatoire, un contenu markdown optionnel, et un dossier parent facultatif. La note sera automatiquement positionnée dans l\'ordre du classeur.',
    parameters: {
      type: 'object',
      properties: {
        source_title: {
          type: 'string',
          description: 'Titre de la note (obligatoire, max 255 caractères)'
        },
        notebook_id: {
          type: 'string',
          description: 'ID ou slug du classeur où créer la note (obligatoire). Utilise le paramètre "notebook_id" exactement comme nommé ici.'
        },
        markdown_content: {
          type: 'string',
          description: 'Contenu markdown de la note (optionnel, sera ajouté au début)'
        }
      },
      required: ['source_title', 'notebook_id']
    }
  }
];

console.log('🧪 Test des descriptions simplifiées vs complexes\n');

console.log('📋 DESCRIPTIONS SIMPLIFIÉES:');
simplifiedTools.forEach((tool, index) => {
  console.log(`\n${index + 1}. ${tool.name}:`);
  console.log(`   Description: ${tool.description}`);
  console.log(`   Longueur: ${tool.description.length} caractères`);
  console.log(`   Clarté: ✅ Simple et directe`);
});

console.log('\n📋 DESCRIPTIONS COMPLEXES (anciennes):');
complexTools.forEach((tool, index) => {
  console.log(`\n${index + 1}. ${tool.name}:`);
  console.log(`   Description: ${tool.description}`);
  console.log(`   Longueur: ${tool.description.length} caractères`);
  console.log(`   Clarté: ❌ Trop verbeuse et confuse`);
});

console.log('\n🎯 ANALYSE:');
console.log('=====================================');
console.log('✅ Descriptions simplifiées:');
console.log('   - Courtes et directes');
console.log('   - Instructions claires');
console.log('   - Moins de confusion pour le LLM');
console.log('   - "IMPORTANT: Fournir UN SEUL objet JSON"');

console.log('\n❌ Descriptions complexes:');
console.log('   - Trop verbeuses');
console.log('   - Instructions confuses');
console.log('   - LLM se perd dans les détails');
console.log('   - Risque de payload malformé');

console.log('\n💡 HYPOTHÈSE:');
console.log('Les descriptions simplifiées devraient réduire les payloads malformés');
console.log('car le LLM aura des instructions plus claires et directes.');

console.log('\n🎉 Test terminé !');
console.log('\n💡 Prochain test:');
console.log('   1. Redémarrer le serveur');
console.log('   2. Tester avec un agent');
console.log('   3. Vérifier les payloads générés'); 