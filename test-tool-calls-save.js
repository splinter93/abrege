const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testToolCallsSave() {
  console.log('🧪 Test de sauvegarde des Tool Calls');
  
  try {
    // 1. Se connecter avec un utilisateur de test
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword'
    });

    if (authError) {
      console.error('❌ Erreur d\'authentification:', authError.message);
      return;
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // 2. Récupérer une session existante
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (sessionsError || !sessions || sessions.length === 0) {
      console.error('❌ Erreur récupération sessions:', sessionsError);
      return;
    }

    const session = sessions[0];
    console.log('✅ Session trouvée:', session.id);

    // 3. Ajouter un message assistant avec tool call
    const assistantMessage = {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: 'call_test_456',
        type: 'function',
        function: {
          name: 'create_note',
          arguments: JSON.stringify({
            source_title: 'Test Tool Call',
            notebook_id: 'test-notebook'
          })
        }
      }],
      timestamp: new Date().toISOString()
    };

    const { error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: session.id,
        ...assistantMessage
      });

    if (assistantMsgError) {
      console.error('❌ Erreur message assistant:', assistantMsgError.message);
      return;
    }

    console.log('✅ Message assistant avec tool call ajouté');

    // 4. Ajouter un message tool avec résultat
    const toolMessage = {
      role: 'tool',
      content: JSON.stringify({
        success: true,
        note: {
          id: 'note_test_789',
          title: 'Test Tool Call',
          slug: 'test-tool-call'
        }
      }),
      tool_call_id: 'call_test_456',
      timestamp: new Date().toISOString()
    };

    const { error: toolMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: session.id,
        ...toolMessage
      });

    if (toolMsgError) {
      console.error('❌ Erreur message tool:', toolMsgError.message);
      return;
    }

    console.log('✅ Message tool avec résultat ajouté');

    // 5. Vérifier que les tool calls sont bien dans le thread
    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .select('thread')
      .eq('id', session.id)
      .single();

    if (updateError) {
      console.error('❌ Erreur récupération session mise à jour:', updateError.message);
      return;
    }

    console.log('✅ Thread mis à jour:', updatedSession.thread.length, 'messages');

    // 6. Vérifier les tool calls
    const toolCallMessages = updatedSession.thread.filter(msg => msg.tool_calls || msg.role === 'tool');
    console.log('🔍 Tool calls trouvés:', toolCallMessages.length);

    toolCallMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. Role: ${msg.role}`);
      if (msg.tool_calls) {
        console.log(`     Tool calls: ${msg.tool_calls.length}`);
      }
      if (msg.tool_call_id) {
        console.log(`     Tool call ID: ${msg.tool_call_id}`);
      }
    });

    console.log('\n🎉 Test terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

testToolCallsSave(); 