require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiToolCalls() {
  try {
    console.log('🧪 Test de l\'API de sauvegarde des tool calls...\n');

    // 1. Créer une session de test
    const sessionId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const session = {
      id: sessionId,
      name: 'Test API Tool Calls',
      user_id: userId,
      thread: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      metadata: {},
      history_limit: 10
    };

    const { error: sessionError } = await supabase
      .from('chat_sessions')
      .insert(session);

    if (sessionError) {
      console.error('❌ Erreur création session:', sessionError.message);
      return;
    }

    console.log('✅ Session de test créée:', sessionId);

    // 2. Tester l'API avec un message assistant avec tool call
    const assistantMessage = {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: 'call_test_456',
        type: 'function',
        function: {
          name: 'create_note',
          arguments: JSON.stringify({
            source_title: 'Note de test',
            notebook_id: 'test-notebook',
            content: 'Contenu de test'
          })
        }
      }],
      timestamp: new Date().toISOString()
    };

    console.log('📤 Test 1: Message assistant avec tool call');
    console.log('Message:', JSON.stringify(assistantMessage, null, 2));

    // Simuler l'appel API
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/ui/chat-sessions/${sessionId}/messages`;

    console.log('🌐 URL API:', apiUrl);

    // 3. Tester avec fetch (simulation de l'API)
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(assistantMessage)
      });

      const data = await response.json();
      console.log('📥 Réponse API:', response.status, data);

      if (response.ok) {
        console.log('✅ Message assistant sauvegardé avec succès');
      } else {
        console.log('❌ Erreur API:', data.error);
      }
    } catch (fetchError) {
      console.log('❌ Erreur fetch:', fetchError.message);
      console.log('💡 L\'API n\'est probablement pas démarrée. Test en mode simulation...');
    }

    // 4. Vérifier directement en base de données
    console.log('\n🔍 Vérification en base de données...');
    
    const { data: updatedSession, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('thread')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      console.error('❌ Erreur récupération session:', fetchError.message);
    } else {
      console.log('📋 Thread après test:', updatedSession.thread.length, 'messages');
      
      const toolCallMessages = updatedSession.thread.filter(msg => msg.tool_calls || msg.role === 'tool');
      console.log('🔧 Tool calls trouvés:', toolCallMessages.length);
      
      toolCallMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. Role: ${msg.role}`);
        if (msg.tool_calls) {
          console.log(`     Tool calls: ${msg.tool_calls.length}`);
          msg.tool_calls.forEach((toolCall, tcIndex) => {
            console.log(`        ${tcIndex + 1}. ${toolCall.function.name}`);
          });
        }
        if (msg.tool_call_id) {
          console.log(`     Tool call ID: ${msg.tool_call_id}`);
        }
      });
    }

    // 5. Nettoyer - supprimer la session de test
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('❌ Erreur suppression session:', deleteError.message);
    } else {
      console.log('🧹 Session de test supprimée');
    }

    console.log('\n🎉 Test terminé !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testApiToolCalls(); 