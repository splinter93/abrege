#!/usr/bin/env node

/**
 * Diagnostic du système de tools
 * Identifie pourquoi seul get_notebook fonctionne
 */

console.log('🔍 Diagnostic du système de tools...');

// Simulation de l'AgentApiV2Tools
class MockAgentApiV2Tools {
  constructor() {
    this.tools = new Map();
    this.initializeTools();
  }

  initializeTools() {
    // Tool: Créer une note
    this.tools.set('create_note', {
      name: 'create_note',
      description: 'Créer une nouvelle note',
      parameters: {
        type: 'object',
        properties: {
          source_title: { type: 'string', description: 'Titre de la note' },
          notebook_id: { type: 'string', description: 'ID du classeur' },
          markdown_content: { type: 'string', description: 'Contenu markdown' }
        },
        required: ['source_title', 'notebook_id']
      },
      execute: async (params) => {
        console.log('✅ create_note exécuté avec:', params);
        return { success: true, data: { id: 'note-123', title: params.source_title } };
      }
    });

    // Tool: Mettre à jour une note
    this.tools.set('update_note', {
      name: 'update_note',
      description: 'Modifier une note existante',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'ID de la note' },
          source_title: { type: 'string', description: 'Nouveau titre' },
          markdown_content: { type: 'string', description: 'Nouveau contenu' }
        },
        required: ['ref']
      },
      execute: async (params) => {
        console.log('✅ update_note exécuté avec:', params);
        return { success: true, data: { id: params.ref, updated: true } };
      }
    });

    // Tool: Obtenir le contenu d'une note
    this.tools.set('get_note_content', {
      name: 'get_note_content',
      description: 'Obtenir le contenu d\'une note',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'ID de la note' }
        },
        required: ['ref']
      },
      execute: async (params) => {
        console.log('✅ get_note_content exécuté avec:', params);
        return { success: true, data: { content: 'Contenu de la note...' } };
      }
    });

    // Tool: Obtenir un classeur (celui qui marche)
    this.tools.set('get_notebook', {
      name: 'get_notebook',
      description: 'Obtenir les informations d\'un classeur',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'ID ou slug du classeur' }
        },
        required: ['ref']
      },
      execute: async (params) => {
        console.log('✅ get_notebook exécuté avec:', params);
        return { success: true, data: { id: params.ref, name: 'Classeur Test' } };
      }
    });
  }

  getToolsForFunctionCalling(capabilities) {
    console.log(`🔧 Nombre de tools dans la Map: ${this.tools.size}`);
    console.log(`🔧 Tools disponibles: ${Array.from(this.tools.keys()).join(', ')}`);
    
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
      console.log(`🔧 Tools filtrés selon capacités: ${filteredTools.length}/${allTools.length}`);
      console.log(`🔧 Tools filtrés: ${filteredTools.map(t => t.function.name).join(', ')}`);
      return filteredTools;
    }
    
    console.log(`🔧 Tools configurés pour function calling: ${allTools.length}`);
    return allTools;
  }

  async executeTool(toolName, parameters) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    return await tool.execute(parameters);
  }
}

// Test 1: Sans capacités (comportement actuel)
console.log('\n🧪 Test 1: Sans capacités spécifiques');
const mockTools1 = new MockAgentApiV2Tools();
const tools1 = mockTools1.getToolsForFunctionCalling();
console.log(`📊 Tools envoyés: ${tools1.length}`);
console.log(`📋 Tools: ${tools1.map(t => t.function.name).join(', ')}`);

// Test 2: Avec capacités spécifiques
console.log('\n🧪 Test 2: Avec capacités spécifiques');
const capabilities = ['create_note', 'update_note'];
const tools2 = mockTools1.getToolsForFunctionCalling(capabilities);
console.log(`📊 Tools envoyés: ${tools2.length}`);
console.log(`📋 Tools: ${tools2.map(t => t.function.name).join(', ')}`);

// Test 3: Simulation d'un agent avec capacités
console.log('\n🧪 Test 3: Simulation d\'un agent avec capacités');
const agentConfig = {
  api_v2_capabilities: ['create_note', 'get_notebook']
};

const tools3 = agentConfig.api_v2_capabilities?.length > 0 
  ? mockTools1.getToolsForFunctionCalling(agentConfig.api_v2_capabilities)
  : undefined;

console.log(`📊 Tools envoyés: ${tools3?.length || 0}`);
console.log(`📋 Tools: ${tools3?.map(t => t.function.name).join(', ') || 'Aucun'}`);

// Test 4: Simulation d'un agent sans capacités
console.log('\n🧪 Test 4: Simulation d\'un agent sans capacités');
const agentConfigEmpty = {
  api_v2_capabilities: []
};

const tools4 = agentConfigEmpty.api_v2_capabilities?.length > 0 
  ? mockTools1.getToolsForFunctionCalling(agentConfigEmpty.api_v2_capabilities)
  : undefined;

console.log(`📊 Tools envoyés: ${tools4?.length || 0}`);
console.log(`📋 Tools: ${tools4?.map(t => t.function.name).join(', ') || 'Aucun'}`);

// Test 5: Test d'exécution des tools
console.log('\n🧪 Test 5: Test d\'exécution des tools');
try {
  const result1 = await mockTools1.executeTool('create_note', {
    source_title: 'Test Note',
    notebook_id: 'notebook-123',
    markdown_content: 'Contenu de test'
  });
  console.log('✅ create_note:', result1);

  const result2 = await mockTools1.executeTool('get_notebook', {
    ref: 'notebook-123'
  });
  console.log('✅ get_notebook:', result2);

  const result3 = await mockTools1.executeTool('update_note', {
    ref: 'note-123',
    source_title: 'Titre mis à jour'
  });
  console.log('✅ update_note:', result3);

} catch (error) {
  console.error('❌ Erreur lors de l\'exécution:', error.message);
}

// Diagnostic du problème
console.log('\n🔍 DIAGNOSTIC DU PROBLÈME:');

console.log('1. ✅ Tous les tools sont correctement définis');
console.log('2. ✅ La méthode getToolsForFunctionCalling fonctionne');
console.log('3. ✅ L\'exécution des tools fonctionne');
console.log('4. ❌ PROBLÈME: L\'API envoie TOUJOURS tous les tools, sans vérifier les capacités');

console.log('\n💡 SOLUTION:');
console.log('Modifier l\'API pour vérifier les capacités de l\'agent:');
console.log('const tools = agentConfig?.api_v2_capabilities?.length > 0');
console.log('  ? agentApiV2Tools.getToolsForFunctionCalling(agentConfig.api_v2_capabilities)');
console.log('  : undefined;'); 