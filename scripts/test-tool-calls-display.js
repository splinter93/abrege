const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testToolCallsDisplay() {
  console.log('🧪 Test d\'affichage des Tool Calls');
  
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

    // 2. Créer une session de chat
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        name: 'Test Tool Calls',
        thread: [],
        history_limit: 10
      })
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Erreur création session:', sessionError.message);
      return;
    }

    console.log('✅ Session créée:', session.id);

    // 3. Ajouter un message utilisateur
    const userMessage = {
      role: 'user',
      content: 'Peux-tu créer une note de test pour moi ?',
      timestamp: new Date().toISOString()
    };

    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: session.id,
        ...userMessage
      });

    if (userMsgError) {
      console.error('❌ Erreur message utilisateur:', userMsgError.message);
      return;
    }

    console.log('✅ Message utilisateur ajouté');

    // 4. Ajouter un message assistant avec tool call
    const assistantMessage = {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: 'call_test_123',
        type: 'function',
        function: {
          name: 'create_note',
          arguments: JSON.stringify({
            source_title: 'Note de test',
            notebook_id: 'test-classeur',
            content: 'Contenu de test'
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

    // 5. Ajouter un message tool avec résultat
    const toolMessage = {
      role: 'tool',
      content: JSON.stringify({
        success: true,
        note: {
          id: 'note_test_456',
          title: 'Note de test',
          slug: 'note-de-test',
          created_at: new Date().toISOString()
        }
      }),
      tool_call_id: 'call_test_123',
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

    // 6. Ajouter un message assistant final
    const finalMessage = {
      role: 'assistant',
      content: 'Parfait ! J\'ai créé la note "Note de test" dans votre classeur. La note a été créée avec succès.',
      timestamp: new Date().toISOString()
    };

    const { error: finalMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: session.id,
        ...finalMessage
      });

    if (finalMsgError) {
      console.error('❌ Erreur message final:', finalMsgError.message);
      return;
    }

    console.log('✅ Message final ajouté');

    console.log('\n🎉 Test terminé avec succès !');
    console.log('📝 Session ID:', session.id);
    console.log('🌐 Visitez http://localhost:3000/chat pour voir les tool calls en action');

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

testToolCallsDisplay(); 