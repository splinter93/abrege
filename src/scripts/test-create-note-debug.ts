#!/usr/bin/env tsx

/**
 * Script de debug pour tester create_note
 */

async function testCreateNote() {
  console.log('🔍 Test de debug pour create_note\n');

  try {
    // Test 1: Vérifier l'endpoint API V2 directement
    console.log('1️⃣ Test endpoint API V2...');
    const response = await fetch('http://localhost:3000/api/v2/note/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        source_title: 'Note de test',
        notebook_id: 'test-notebook-id',
        markdown_content: 'Contenu de test'
      })
    });

    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, result);

    // Test 2: Vérifier les tools LLM
    console.log('\n2️⃣ Test tools LLM...');
    const toolsResponse = await fetch('http://localhost:3000/api/v2/tools');
    const toolsData = await toolsResponse.json();
    
    const createNoteTool = toolsData.tools.find((tool: any) => tool.function.name === 'create_note');
    if (createNoteTool) {
      console.log('✅ Tool create_note trouvé');
      console.log('Paramètres:', createNoteTool.function.parameters);
    } else {
      console.log('❌ Tool create_note non trouvé');
    }

    // Test 3: Test via chat LLM
    console.log('\n3️⃣ Test via chat LLM...');
    const chatResponse = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        message: 'Créer une note de test',
        context: {
          sessionId: `test-debug-${Date.now()}`,
          agentId: 'test-agent'
        },
        history: [],
        provider: 'groq'
      })
    });

    const chatResult = await chatResponse.json();
    console.log(`Chat Status: ${chatResponse.status}`);
    console.log(`Chat Response:`, JSON.stringify(chatResult, null, 2));

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
if (require.main === module) {
  testCreateNote().catch(console.error);
}

export { testCreateNote };
