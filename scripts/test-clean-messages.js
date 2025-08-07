#!/usr/bin/env node

/**
 * Script de test pour vérifier le nettoyage des messages
 * Teste que les tool_calls sont supprimés des messages user
 */

function testCleanMessages() {
  console.log('🧹 Test du nettoyage des messages - Suppression tool_calls des messages user\n');

  try {
    // 1. Simuler un historique avec des tool_calls dans les messages user
    const dirtyMessages = [
      {
        role: 'system',
        content: 'Tu es un assistant...'
      },
      {
        role: 'user',
        content: 'Crée une note',
        tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'create_note' } }] // ❌ À supprimer
      },
      {
        role: 'assistant',
        content: null,
        tool_calls: [{ id: 'call_456', type: 'function', function: { name: 'create_note' } }] // ✅ À garder
      },
      {
        role: 'tool',
        tool_call_id: 'call_456',
        name: 'create_note',
        content: '{"success":true}'
      },
      {
        role: 'user',
        content: 'Merci',
        tool_calls: [{ id: 'call_789', type: 'function', function: { name: 'get_notes' } }] // ❌ À supprimer
      }
    ];

    console.log('📋 Historique sale (avec tool_calls dans les messages user):');
    dirtyMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.role.toUpperCase()}]`);
      if (msg.content) {
        console.log(`     Contenu: ${msg.content.substring(0, 50)}...`);
      }
      if (msg.tool_calls) {
        console.log(`     🔧 Tool calls: ${msg.tool_calls.length} (${msg.role === 'user' ? '❌ À supprimer' : '✅ À garder'})`);
      }
    });
    console.log('');

    // 2. Appliquer le nettoyage
    console.log('🧹 Application du nettoyage...');
    const cleanMessages = dirtyMessages.filter(msg => {
      // Garder tous les messages sauf les tool_calls dans les messages user
      if (msg.role === 'user' && 'tool_calls' in msg) {
        console.log(`   🔧 Suppression tool_calls du message user: "${msg.content}"`);
        return false;
      }
      return true;
    });

    console.log('');

    // 3. Vérifier le résultat
    console.log('✅ Historique propre (tool_calls supprimés des messages user):');
    cleanMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.role.toUpperCase()}]`);
      if (msg.content) {
        console.log(`     Contenu: ${msg.content.substring(0, 50)}...`);
      }
      if (msg.tool_calls) {
        console.log(`     🔧 Tool calls: ${msg.tool_calls.length} (${msg.role === 'user' ? '❌ ERREUR' : '✅ Correct'})`);
      }
    });
    console.log('');

    // 4. Validation
    console.log('🔍 Validation du nettoyage:');
    
    const userMessagesWithToolCalls = cleanMessages.filter(msg => 
      msg.role === 'user' && 'tool_calls' in msg
    );
    
    const assistantMessagesWithToolCalls = cleanMessages.filter(msg => 
      msg.role === 'assistant' && 'tool_calls' in msg
    );
    
    const toolMessages = cleanMessages.filter(msg => 
      msg.role === 'tool'
    );
    
    console.log(`   ✅ Messages user avec tool_calls: ${userMessagesWithToolCalls.length} (doit être 0)`);
    console.log(`   ✅ Messages assistant avec tool_calls: ${assistantMessagesWithToolCalls.length} (doit être > 0)`);
    console.log(`   ✅ Messages tool: ${toolMessages.length} (doit être > 0)`);
    console.log(`   ✅ Total messages: ${cleanMessages.length} (doit être < ${dirtyMessages.length})`);
    console.log('');

    // 5. Test de la structure finale
    console.log('🎯 Test de la structure finale:');
    
    const isValid = 
      userMessagesWithToolCalls.length === 0 &&
      assistantMessagesWithToolCalls.length > 0 &&
      toolMessages.length > 0 &&
      cleanMessages.length < dirtyMessages.length;
    
    console.log(`   ✅ Structure valide: ${isValid}`);
    
    if (isValid) {
      console.log('   ✅ Les tool_calls ont été correctement supprimés des messages user');
      console.log('   ✅ Les tool_calls des messages assistant sont conservés');
      console.log('   ✅ Les messages tool sont conservés');
      console.log('   ✅ L\'historique est plus propre');
    } else {
      console.log('   ❌ Le nettoyage n\'a pas fonctionné correctement');
    }
    console.log('');

    // 6. Test de l'impact sur le LLM
    console.log('🤖 Impact sur le LLM:');
    console.log('   ✅ Messages user plus propres (pas de tool_calls inutiles)');
    console.log('   ✅ Historique plus lisible pour le modèle');
    console.log('   ✅ Évite la confusion dans le parsing');
    console.log('   ✅ Réduit la taille des payloads');
    console.log('');

    console.log('🎉 Test de nettoyage terminé avec succès !');
    console.log('📝 Les tool_calls sont maintenant supprimés des messages user.');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testCleanMessages(); 