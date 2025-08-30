#!/usr/bin/env node

/**
 * Script de test pour l'API batch de messages
 * Teste la persistance atomique des tool calls
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBatchAPI() {
  console.log('🧪 Test de l\'API batch de messages...\n');

  try {
    // 1. Créer une session de test
    console.log('1️⃣ Création d\'une session de test...');
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        name: 'Test Batch API',
        thread: [],
        history_limit: 10,
        user_id: '00000000-0000-0000-0000-000000000000' // ID de test
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Erreur création session: ${sessionError.message}`);
    }

    console.log(`✅ Session créée: ${session.id}\n`);

    // 2. Tester l'ajout d'un message simple
    console.log('2️⃣ Test ajout message simple...');
    const simpleMessage = {
      role: 'user',
      content: 'Test message simple',
      timestamp: new Date().toISOString()
    };

    // Tester avec notre API Next.js locale
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || 'http://localhost:3000';
    const simpleResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${session.id}/messages/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        messages: [simpleMessage],
        sessionId: session.id
      })
    });

    if (!simpleResponse.ok) {
      const errorText = await simpleResponse.text();
      throw new Error(`Erreur API simple: ${simpleResponse.status} - ${errorText}`);
    }

    const simpleResult = await simpleResponse.json();
    console.log('✅ Message simple ajouté:', simpleResult.data?.messages?.length, 'messages');

    // 3. Tester l'ajout d'une séquence tool call
    console.log('\n3️⃣ Test séquence tool call...');
    const toolCallSequence = [
      {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_test_123',
          type: 'function',
          function: {
            name: 'test_tool',
            arguments: '{"param": "value"}'
          }
        }],
        timestamp: new Date().toISOString()
      },
      {
        role: 'tool',
        tool_call_id: 'call_test_123',
        name: 'test_tool',
        content: '{"success": true, "result": "test result"}',
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        content: 'Résultat du test: test result',
        timestamp: new Date().toISOString()
      }
    ];

    const toolResponse = await fetch(`${baseUrl}/api/ui/chat-sessions/${session.id}/messages/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        messages: toolCallSequence,
        sessionId: session.id
      })
    });

    if (!toolResponse.ok) {
      const errorText = await toolResponse.text();
      throw new Error(`Erreur API tool call: ${toolResponse.status} - ${errorText}`);
    }

    const toolResult = await toolResponse.json();
    console.log('✅ Séquence tool call ajoutée:', toolResult.data?.messages?.length, 'messages');

    // 4. Vérifier la session mise à jour
    console.log('\n4️⃣ Vérification de la session...');
    const { data: updatedSession, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', session.id)
      .single();

    if (fetchError) {
      throw new Error(`Erreur récupération session: ${fetchError.message}`);
    }

    console.log('✅ Session mise à jour:');
    console.log(`   - Thread: ${updatedSession.thread?.length || 0} messages`);
    console.log(`   - Dernière mise à jour: ${updatedSession.updated_at}`);

    // 5. Vérifier le contenu du thread
    if (updatedSession.thread && Array.isArray(updatedSession.thread)) {
      console.log('\n📋 Contenu du thread:');
      updatedSession.thread.forEach((msg, index) => {
        console.log(`   ${index + 1}. [${msg.role}] ${msg.content ? msg.content.substring(0, 50) + '...' : 'Tool calls'}`);
        if (msg.tool_calls) {
          console.log(`       Tool calls: ${msg.tool_calls.length}`);
        }
        if (msg.tool_call_id) {
          console.log(`       Tool call ID: ${msg.tool_call_id}`);
        }
      });
    }

    // 6. Nettoyer la session de test
    console.log('\n5️⃣ Nettoyage...');
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', session.id);

    if (deleteError) {
      console.warn('⚠️ Erreur suppression session de test:', deleteError.message);
    } else {
      console.log('✅ Session de test supprimée');
    }

    console.log('\n🎉 Test de l\'API batch réussi !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le test
if (require.main === module) {
  testBatchAPI();
}

module.exports = { testBatchAPI }; 