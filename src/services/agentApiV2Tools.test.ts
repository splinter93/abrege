import { agentApiV2Tools } from './agentApiV2Tools';

console.log('🧪 TEST FUNCTION CALLING API V2');
console.log('================================');

// Afficher les outils disponibles
console.log('\n🎯 Outils disponibles:');
console.log(agentApiV2Tools.getAvailableTools());

// Afficher la configuration pour function calling
console.log('\n🔧 Configuration Function Calling:');
console.log(JSON.stringify(agentApiV2Tools.getToolsForFunctionCalling(), null, 2));

// Test d'exécution d'un outil
console.log('\n🧪 Test d\'exécution d\'outil:');

// Simuler l'exécution d'un outil (sans vraie API)
const testToolExecution = async () => {
  try {
    // Test création de note
    const createNoteParams = {
      source_title: 'Test Note',
      markdown_content: '# Test\n\nContenu de test',
      notebook_id: 'test-notebook-id'
    };

    console.log('📝 Test création de note:');
    console.log('Paramètres:', createNoteParams);
    
    // Note: En vrai, cela appellerait l'API v2
    // const result = await agentApiV2Tools.executeTool('create_note', createNoteParams, 'test-user-id');
    // console.log('Résultat:', result);
    
    console.log('✅ Test simulé réussi');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

testToolExecution();

// Exemple d'utilisation dans un LLM
console.log('\n🤖 Exemple d\'utilisation dans un LLM:');
console.log(`
Message utilisateur: "Créer une note 'Mon analyse' avec le contenu 'Voici mon analyse...'"

Le LLM peut maintenant utiliser:
{
  "type": "function",
  "function": {
    "name": "create_note",
    "arguments": {
      "source_title": "Mon analyse",
      "markdown_content": "Voici mon analyse...",
      "notebook_id": "notebook-id"
    }
  }
}

Et le système exécutera automatiquement:
POST /api/v2/note/create
{
  "source_title": "Mon analyse",
  "markdown_content": "Voici mon analyse...",
  "notebook_id": "notebook-id"
}
`); 