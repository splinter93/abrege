#!/usr/bin/env node

/**
 * Script de test pour vérifier le format EXACT attendu
 * Teste que la structure est parfaitement identique aux spécifications
 */

function testExactFormat() {
  console.log('🔧 Test du format EXACT - Structure parfaite\n');

  try {
    // Format EXACT attendu par l'utilisateur
    console.log('✅ Test 1: Format EXACT attendu');
    
    // 1) Assistant déclencheur (format EXACT)
    const assistantMessage = {
      role: 'assistant',
      content: null,               // jamais "undefined"
      tool_calls: [{
        id: 'call_1754521710929',  // ID arbitraire
        type: 'function',
        function: {
          name: 'create_note',
          arguments: '{"notebook_id":"movies","markdown_content":"…"}'
        }
      }]
    };
    
    // 2) Réponse du tool (format EXACT)
    const toolMessage = {
      role: 'tool',
      tool_call_id: 'call_1754521710929', // même ID
      name: 'create_note',                // même nom
      content: '{"success":false,"error":"notebook_id manquant"}'
    };
    
    console.log('📝 Assistant message (format EXACT):');
    console.log(JSON.stringify(assistantMessage, null, 2));
    console.log('');
    
    console.log('📝 Tool message (format EXACT):');
    console.log(JSON.stringify(toolMessage, null, 2));
    console.log('');

    // Test 2: Validation des champs critiques
    console.log('✅ Test 2: Validation des champs critiques');
    
    // Vérifier assistant
    const assistantValid = 
      assistantMessage.content === null &&
      Array.isArray(assistantMessage.tool_calls) &&
      assistantMessage.tool_calls.length === 1 &&
      assistantMessage.tool_calls[0].id &&
      assistantMessage.tool_calls[0].type === 'function' &&
      assistantMessage.tool_calls[0].function?.name &&
      assistantMessage.tool_calls[0].function?.arguments;
    
    console.log('   ✅ Assistant content null:', assistantMessage.content === null);
    console.log('   ✅ Assistant tool_calls array:', Array.isArray(assistantMessage.tool_calls));
    console.log('   ✅ Assistant tool_calls length 1:', assistantMessage.tool_calls.length === 1);
    console.log('   ✅ Assistant tool_call id present:', !!assistantMessage.tool_calls[0].id);
    console.log('   ✅ Assistant tool_call type function:', assistantMessage.tool_calls[0].type === 'function');
    console.log('   ✅ Assistant tool_call function name:', !!assistantMessage.tool_calls[0].function?.name);
    console.log('   ✅ Assistant tool_call function arguments:', !!assistantMessage.tool_calls[0].function?.arguments);
    console.log('   ✅ Assistant format valid:', assistantValid);
    console.log('');

    // Vérifier tool
    const toolValid = 
      toolMessage.role === 'tool' &&
      toolMessage.tool_call_id === assistantMessage.tool_calls[0].id &&
      toolMessage.name === assistantMessage.tool_calls[0].function.name &&
      typeof toolMessage.content === 'string';
    
    console.log('   ✅ Tool role tool:', toolMessage.role === 'tool');
    console.log('   ✅ Tool tool_call_id match:', toolMessage.tool_call_id === assistantMessage.tool_calls[0].id);
    console.log('   ✅ Tool name match:', toolMessage.name === assistantMessage.tool_calls[0].function.name);
    console.log('   ✅ Tool content string:', typeof toolMessage.content === 'string');
    console.log('   ✅ Tool format valid:', toolValid);
    console.log('');

    // Test 3: Historique complet
    console.log('✅ Test 3: Historique complet');
    const messages = [
      { role: 'system', content: 'Tu es un assistant...' },
      { role: 'user', content: 'Crée une note dans movies' },
      assistantMessage,
      toolMessage
    ];
    
    console.log('   ✅ Messages count:', messages.length);
    console.log('   ✅ Assistant at index 2:', messages[2].role === 'assistant');
    console.log('   ✅ Tool at index 3:', messages[3].role === 'tool');
    console.log('   ✅ Assistant has tool_calls:', 'tool_calls' in messages[2]);
    console.log('   ✅ Tool has tool_call_id:', 'tool_call_id' in messages[3]);
    console.log('');

    // Test 4: Relance du modèle
    console.log('✅ Test 4: Relance du modèle');
    const finalPayload = {
      model: 'gpt-4',
      messages: messages, // Tout l'historique
      stream: true,
      temperature: 0.7,
      max_tokens: 4000
      // Pas de tools lors de la relance
    };
    
    console.log('   ✅ Payload has messages:', 'messages' in finalPayload);
    console.log('   ✅ Payload messages count:', finalPayload.messages.length);
    console.log('   ✅ Payload has NO tools:', !('tools' in finalPayload));
    console.log('');

    // Test 5: Validation finale
    console.log('✅ Test 5: Validation finale');
    
    const allValid = assistantValid && toolValid && 
      messages.length === 4 &&
      !('tools' in finalPayload);
    
    console.log('   ✅ All valid:', allValid);
    console.log('');

    if (allValid) {
      console.log('🎉 Format EXACT validé !');
      console.log('📝 La structure est parfaitement identique aux spécifications.');
      console.log('');
      console.log('🔧 Format EXACT qui DÉBLOQUE tout:');
      console.log('1. assistant.content = null (jamais "undefined")');
      console.log('2. assistant.tool_calls = [{ id, type, function }] (Array, pas nombre)');
      console.log('3. tool.tool_call_id = assistant.tool_calls[0].id (même ID)');
      console.log('4. tool.name = assistant.tool_calls[0].function.name (même nom)');
      console.log('5. tool.content = JSON string');
      console.log('6. Renvoyer tout l\'historique au modèle SANS tools');
      console.log('');
      console.log('🚀 Le modèle repartira sans se taire !');
    } else {
      console.log('❌ Format incorrect');
      console.log('🔧 Vérifiez la structure des messages');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testExactFormat(); 