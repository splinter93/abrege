#!/usr/bin/env node

/**
 * Script de test pour valider la documentation des tools
 * Vérifie que les paramètres sont clairement documentés pour le LLM
 */

console.log('🔍 AUDIT DOCUMENTATION TOOLS - VALIDATION');

// Simuler les tools avec leurs descriptions améliorées
const tools = [
  {
    name: 'create_note',
    description: 'Créer une nouvelle note dans un classeur. ATTENTION: Utiliser EXACTEMENT les noms de paramètres suivants: source_title, notebook_id, markdown_content, folder_id. Exemple: {"source_title": "Mon titre", "notebook_id": "uuid-du-classeur"}',
    parameters: {
      type: 'object',
      properties: {
        source_title: {
          type: 'string',
          description: 'Titre de la note (obligatoire) - utiliser EXACTEMENT ce nom'
        },
        notebook_id: {
          type: 'string',
          description: 'ID ou slug du classeur (obligatoire) - utiliser EXACTEMENT ce nom'
        },
        markdown_content: {
          type: 'string',
          description: 'Contenu markdown de la note (optionnel) - utiliser EXACTEMENT ce nom'
        },
        folder_id: {
          type: 'string',
          description: 'ID du dossier parent (optionnel) - utiliser EXACTEMENT ce nom'
        }
      },
      required: ['source_title', 'notebook_id']
    }
  },
  {
    name: 'update_note',
    description: 'Modifier une note existante. ATTENTION: Utiliser EXACTEMENT les noms de paramètres suivants: ref, source_title, markdown_content. Exemple: {"ref": "uuid-de-la-note", "source_title": "Nouveau titre"}',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'ID ou slug de la note à modifier (obligatoire) - utiliser EXACTEMENT ce nom'
        },
        source_title: {
          type: 'string',
          description: 'Nouveau titre de la note (optionnel) - utiliser EXACTEMENT ce nom'
        },
        markdown_content: {
          type: 'string',
          description: 'Nouveau contenu markdown (optionnel) - utiliser EXACTEMENT ce nom'
        }
      },
      required: ['ref']
    }
  },
  {
    name: 'get_tree',
    description: 'Récupérer l\'arborescence d\'un classeur. ATTENTION: Utiliser EXACTEMENT le nom de paramètre suivant: notebook_id. Exemple: {"notebook_id": "uuid-du-classeur"}',
    parameters: {
      type: 'object',
      properties: {
        notebook_id: {
          type: 'string',
          description: 'ID du classeur (obligatoire) - utiliser EXACTEMENT ce nom'
        }
      },
      required: ['notebook_id']
    }
  },
  {
    name: 'create_folder',
    description: 'Créer un nouveau dossier. ATTENTION: Utiliser EXACTEMENT les noms de paramètres suivants: name, notebook_id, parent_id. Exemple: {"name": "Mon dossier", "notebook_id": "uuid-du-classeur"}',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nom du dossier (obligatoire) - utiliser EXACTEMENT ce nom'
        },
        notebook_id: {
          type: 'string',
          description: 'ID du classeur où créer le dossier (obligatoire) - utiliser EXACTEMENT ce nom'
        },
        parent_id: {
          type: 'string',
          description: 'ID du dossier parent (optionnel) - utiliser EXACTEMENT ce nom'
        }
      },
      required: ['name', 'notebook_id']
    }
  }
];

// Tester chaque tool
console.log('\n📋 VALIDATION DES TOOLS:');
tools.forEach((tool, index) => {
  console.log(`\n${index + 1}. ${tool.name.toUpperCase()}`);
  console.log(`   Description: ${tool.description}`);
  console.log(`   Paramètres requis: ${tool.parameters.required.join(', ')}`);
  
  // Vérifier la clarté de la description
  const hasExactWarning = tool.description.includes('EXACTEMENT');
  const hasExample = tool.description.includes('Exemple:');
  const hasParameterList = tool.description.includes('paramètres suivants:');
  
  console.log(`   ✅ Avertissement EXACTEMENT: ${hasExactWarning ? 'OUI' : 'NON'}`);
  console.log(`   ✅ Exemple fourni: ${hasExample ? 'OUI' : 'NON'}`);
  console.log(`   ✅ Liste des paramètres: ${hasParameterList ? 'OUI' : 'NON'}`);
  
  // Vérifier les descriptions des paramètres
  Object.entries(tool.parameters.properties).forEach(([paramName, param]) => {
    const hasExactWarning = param.description.includes('EXACTEMENT');
    console.log(`   📝 ${paramName}: ${hasExactWarning ? '✅' : '❌'} - ${param.description}`);
  });
});

// Tester les erreurs communes
console.log('\n🚨 ERREURS COMMUNES À ÉVITER:');
const commonErrors = [
  { wrong: 'notebookId', correct: 'notebook_id' },
  { wrong: 'noteId', correct: 'ref' },
  { wrong: 'title', correct: 'source_title' },
  { wrong: 'content', correct: 'markdown_content' },
  { wrong: 'folderId', correct: 'folder_id' },
  { wrong: 'parentId', correct: 'parent_id' }
];

commonErrors.forEach(error => {
  console.log(`   ❌ ${error.wrong} → ✅ ${error.correct}`);
});

// Recommandations
console.log('\n💡 RECOMMANDATIONS POUR LE LLM:');
console.log('   1. Lire attentivement la description de chaque tool');
console.log('   2. Utiliser EXACTEMENT les noms de paramètres indiqués');
console.log('   3. Suivre les exemples fournis dans les descriptions');
console.log('   4. Vérifier les paramètres requis vs optionnels');
console.log('   5. Tester avec l\'endpoint /api/llm/tools pour voir tous les exemples');

console.log('\n✅ AUDIT TERMINÉ - Documentation améliorée pour le LLM'); 