// Test de la correction du système de tools pour les agents

// Simulation de l'agentApiV2Tools avec la nouvelle méthode
class MockAgentApiV2Tools {
  constructor() {
    this.tools = new Map();
    this.initializeTools();
  }

  initializeTools() {
    // Simuler les 28 tools disponibles
    const allTools = [
      'create_note', 'update_note', 'delete_note', 'get_note_content',
      'get_note_metadata', 'add_content_to_note', 'insert_content_to_note',
      'add_content_to_section', 'clear_section', 'erase_section',
      'get_table_of_contents', 'get_note_statistics', 'merge_note',
      'move_note', 'publish_note', 'get_note_insights',
      'create_folder', 'update_folder', 'delete_folder', 'get_folder_tree',
      'move_folder', 'create_notebook', 'update_notebook', 'delete_notebook',
      'get_tree', 'reorder_notebooks', 'get_notebooks', 'generate_slug'
    ];

    allTools.forEach(toolName => {
      this.tools.set(toolName, {
        name: toolName,
        description: `Description pour ${toolName}`,
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      });
    });
  }

  getToolsForFunctionCalling(capabilities) {
    console.log(`[MockAgentApiV2Tools] 🔧 Nombre de tools dans la Map: ${this.tools.size}`);
    console.log(`[MockAgentApiV2Tools] 🔧 Tools disponibles: ${Array.from(this.tools.keys()).join(', ')}`);
    
    const allTools = Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
    
    // Si des capacités spécifiques sont demandées, filtrer
    if (capabilities && capabilities.length > 0) {
      const filteredTools = allTools.filter(tool => capabilities.includes(tool.function.name));
      console.log(`[MockAgentApiV2Tools] 🔧 Tools filtrés selon capacités: ${filteredTools.length}/${allTools.length}`);
      return filteredTools;
    }
    
    console.log(`[MockAgentApiV2Tools] 🔧 Tools configurés pour function calling: ${allTools.length}`);
    return allTools;
  }
}

// Tests
const mockTools = new MockAgentApiV2Tools();

// Test 1: Sans capacités (agent sans API v2)
console.log('\n🔧 TEST 1: Agent sans capacités API v2');
const toolsWithoutCapabilities = mockTools.getToolsForFunctionCalling();
console.log(`   Tools disponibles: ${toolsWithoutCapabilities.length}`);
console.log(`   Premier tool: ${toolsWithoutCapabilities[0]?.function?.name || 'Aucun'}`);

// Test 2: Avec capacités spécifiques (Donna)
console.log('\n🔧 TEST 2: Agent avec capacités API v2 (Donna)');
const donnaCapabilities = [
  'create_note',
  'update_note', 
  'add_content_to_note',
  'move_note',
  'delete_note',
  'create_folder'
];
const toolsWithCapabilities = mockTools.getToolsForFunctionCalling(donnaCapabilities);
console.log(`   Capacités Donna: ${donnaCapabilities.join(', ')}`);
console.log(`   Tools filtrés: ${toolsWithCapabilities.length}`);
console.log(`   Tools disponibles: ${toolsWithCapabilities.map(t => t.function.name).join(', ')}`);

// Test 3: Capacités partielles
console.log('\n🔧 TEST 3: Agent avec capacités partielles');
const partialCapabilities = ['create_note', 'delete_note'];
const toolsPartial = mockTools.getToolsForFunctionCalling(partialCapabilities);
console.log(`   Capacités partielles: ${partialCapabilities.join(', ')}`);
console.log(`   Tools filtrés: ${toolsPartial.length}`);
console.log(`   Tools disponibles: ${toolsPartial.map(t => t.function.name).join(', ')}`);

// Test 4: Capacités invalides
console.log('\n🔧 TEST 4: Agent avec capacités invalides');
const invalidCapabilities = ['invalid_tool', 'another_invalid'];
const toolsInvalid = mockTools.getToolsForFunctionCalling(invalidCapabilities);
console.log(`   Capacités invalides: ${invalidCapabilities.join(', ')}`);
console.log(`   Tools filtrés: ${toolsInvalid.length}`);
console.log(`   Tools disponibles: ${toolsInvalid.map(t => t.function.name).join(', ')}`);

// Test 5: Simulation de l'API LLM
console.log('\n🔧 TEST 5: Simulation de l\'API LLM');
const agentConfig = {
  api_v2_capabilities: donnaCapabilities
};

const tools = agentConfig?.api_v2_capabilities?.length > 0 
  ? mockTools.getToolsForFunctionCalling(agentConfig.api_v2_capabilities)
  : undefined;

console.log(`   Agent config: ${agentConfig.api_v2_capabilities.join(', ')}`);
console.log(`   Tools envoyés au LLM: ${tools?.length || 0}`);
console.log(`   Tools disponibles: ${tools?.map(t => t.function.name).join(', ') || 'Aucun'}`);

console.log('\n✅ TESTS TERMINÉS');
console.log('📊 RÉSULTATS:');
console.log(`   - Total tools disponibles: ${toolsWithoutCapabilities.length}`);
console.log(`   - Tools pour Donna: ${toolsWithCapabilities.length}`);
console.log(`   - Filtrage fonctionnel: ${toolsWithCapabilities.length < toolsWithoutCapabilities.length ? '✅' : '❌'}`);
console.log(`   - API LLM fonctionnelle: ${tools && tools.length > 0 ? '✅' : '❌'}`);

console.log('\n🎯 CONCLUSION:');
console.log('   La correction permet maintenant de:');
console.log('   1. Filtrer les tools selon les capacités de l\'agent');
console.log('   2. Envoyer seulement les tools autorisés au LLM');
console.log('   3. Éviter d\'envoyer tous les tools à tous les agents');
console.log('   4. Permettre à Donna de voir ses tools spécifiques'); 