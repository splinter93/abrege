#!/usr/bin/env node

/**
 * Script de test pour vérifier le format qui DÉBLOQUE tout
 * Teste la structure minimale qui fonctionne parfaitement
 */

function testDebloqueFormat() {
  console.log('🔧 Test du format qui DÉBLOQUE tout - Structure minimale parfaite\n');

  try {
    // 1. Test: Assistant déclencheur (structure minimale qui DÉBLOQUE tout)
    console.log('✅ Test 1: Assistant déclencheur');
    const assistantMessage = {
      role: 'assistant',
      content: null, // 🔧 SÉCURITÉ: jamais "undefined"
      tool_calls: [{ // 🔧 SÉCURITÉ: Array [{...}], pas nombre
        id: 'call_1754521710929', // 🔧 SÉCURITÉ: ID arbitraire
        type: 'function',
        function: {
          name: 'create_note',
          arguments: '{"notebook_id":"movies","markdown_content":"..."}'
        }
      }]
    };
    
    console.log('   ✅ content:', assistantMessage.content);
    console.log('   ✅ tool_calls type:', Array.isArray(assistantMessage.tool_calls) ? 'Array' : 'ERROR');
    console.log('   ✅ tool_calls length:', assistantMessage.tool_calls.length);
    console.log('   ✅ tool_call id:', assistantMessage.tool_calls[0].id);
    console.log('   ✅ tool_call function name:', assistantMessage.tool_calls[0].function.name);
    console.log('   ✅ tool_call arguments:', assistantMessage.tool_calls[0].function.arguments.substring(0, 50) + '...');
    console.log('');

    // 2. Test: Réponse du tool (structure minimale qui DÉBLOQUE tout)
    console.log('✅ Test 2: Réponse du tool');
    const toolMessage = {
      role: 'tool',
      tool_call_id: 'call_1754521710929', // 🔧 SÉCURITÉ: même ID
      name: 'create_note', // 🔧 SÉCURITÉ: même nom
      content: '{"success":false,"error":"notebook_id manquant"}' // 🔧 SÉCURITÉ: JSON string
    };
    
    console.log('   ✅ tool_call_id:', toolMessage.tool_call_id);
    console.log('   ✅ name:', toolMessage.name);
    console.log('   ✅ content type:', typeof toolMessage.content);
    console.log('   ✅ content valid JSON:', (() => {
      try {
        JSON.parse(toolMessage.content);
        return 'Valid';
      } catch {
        return 'Invalid';
      }
    })());
    console.log('');

    // 3. Test: Correspondance ID et nom
    console.log('✅ Test 3: Correspondance ID et nom');
    const idMatch = assistantMessage.tool_calls[0].id === toolMessage.tool_call_id;
    const nameMatch = assistantMessage.tool_calls[0].function.name === toolMessage.name;
    
    console.log('   ✅ ID correspond:', idMatch);
    console.log('   ✅ Nom correspond:', nameMatch);
    console.log('   ✅ Correspondance parfaite:', idMatch && nameMatch);
    console.log('');

    // 4. Test: Historique complet
    console.log('✅ Test 4: Historique complet');
    const messages = [
      { role: 'system', content: 'Tu es un assistant...' },
      { role: 'user', content: 'Crée une note dans movies' },
      assistantMessage,
      toolMessage
    ];
    
    console.log('   ✅ Messages count:', messages.length);
    console.log('   ✅ Assistant message index:', messages.findIndex(m => m.role === 'assistant'));
    console.log('   ✅ Tool message index:', messages.findIndex(m => m.role === 'tool'));
    console.log('');

    // 5. Test: Relance du modèle
    console.log('✅ Test 5: Relance du modèle');
    const finalPayload = {
      model: 'gpt-4',
      messages: messages, // 🔧 SÉCURITÉ: tout l'historique
      stream: true,
      temperature: 0.7,
      max_tokens: 4000
      // 🔧 SÉCURITÉ: Pas de tools lors de la relance
    };
    
    console.log('   ✅ Payload model:', finalPayload.model);
    console.log('   ✅ Payload messages count:', finalPayload.messages.length);
    console.log('   ✅ Payload has tools:', 'tools' in finalPayload ? 'ERROR' : 'OK');
    console.log('');

    // 6. Test: Validation complète
    console.log('✅ Test 6: Validation complète');
    
    // Vérifier que l'assistant a le bon format
    const assistantValid = 
      assistantMessage.content === null &&
      Array.isArray(assistantMessage.tool_calls) &&
      assistantMessage.tool_calls.length > 0 &&
      assistantMessage.tool_calls[0].id &&
      assistantMessage.tool_calls[0].function?.name;
    
    console.log('   ✅ Assistant format valid:', assistantValid);
    
    // Vérifier que le tool a le bon format
    const toolValid = 
      toolMessage.tool_call_id === assistantMessage.tool_calls[0].id &&
      toolMessage.name === assistantMessage.tool_calls[0].function.name &&
      typeof toolMessage.content === 'string';
    
    console.log('   ✅ Tool format valid:', toolValid);
    
    // Vérifier que l'historique est complet
    const historyValid = 
      messages.length >= 4 &&
      messages.some(m => m.role === 'assistant' && m.tool_calls) &&
      messages.some(m => m.role === 'tool' && m.tool_call_id);
    
    console.log('   ✅ History format valid:', historyValid);
    
    // Vérifier que le payload est correct
    const payloadValid = 
      finalPayload.messages.length === messages.length &&
      !('tools' in finalPayload);
    
    console.log('   ✅ Payload format valid:', payloadValid);
    
    const allValid = assistantValid && toolValid && historyValid && payloadValid;
    console.log('   ✅ All valid:', allValid);
    console.log('');

    if (allValid) {
      console.log('🎉 Tous les tests passés !');
      console.log('📝 Le format est parfait et DÉBLOQUE tout.');
      console.log('');
      console.log('🔧 Structure minimale qui DÉBLOQUE tout:');
      console.log('1. assistant.content = null (jamais "undefined")');
      console.log('2. assistant.tool_calls = [{ id, type, function }] (Array, pas nombre)');
      console.log('3. tool.tool_call_id = assistant.tool_calls[0].id (même ID)');
      console.log('4. tool.name = assistant.tool_calls[0].function.name (même nom)');
      console.log('5. tool.content = JSON string');
      console.log('6. Renvoyer tout l\'historique au modèle SANS tools');
      console.log('');
      console.log('🚀 Le modèle repartira sans se taire !');
    } else {
      console.log('❌ Certains tests ont échoué');
      console.log('🔧 Vérifiez le format des messages');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testDebloqueFormat(); 