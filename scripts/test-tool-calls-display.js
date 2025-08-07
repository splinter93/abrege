require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testToolCallsDisplay() {
  try {
    console.log('🧪 Test d\'affichage des tool calls...\n');

    // 1. Créer une session de test avec des tool calls
    const sessionId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const session = {
      id: sessionId,
      name: 'Test Tool Calls Display',
      user_id: userId,
      thread: [
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: 'Crée une note de test',
          timestamp: new Date().toISOString()
        },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_test_123',
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
        },
        {
          id: crypto.randomUUID(),
          role: 'tool',
          content: JSON.stringify({
            success: true,
            note: {
              id: 'note_test_456',
              title: 'Note de test',
              slug: 'note-de-test'
            }
          }),
          tool_call_id: 'call_test_123',
          timestamp: new Date().toISOString()
        },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'J\'ai créé la note "Note de test" avec succès !',
          timestamp: new Date().toISOString()
        }
      ],
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

    console.log('✅ Session de test créée avec tool calls:', sessionId);

    // 2. Vérifier que les tool calls sont bien dans le thread
    const { data: createdSession, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('thread')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      console.error('❌ Erreur récupération session:', fetchError.message);
      return;
    }

    console.log('📋 Thread créé:', createdSession.thread.length, 'messages');
    
    const toolCallMessages = createdSession.thread.filter(msg => msg.tool_calls || msg.role === 'tool');
    console.log('🔧 Tool calls trouvés:', toolCallMessages.length);
    
    toolCallMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. Role: ${msg.role}`);
      if (msg.tool_calls) {
        console.log(`     Tool calls: ${msg.tool_calls.length}`);
        msg.tool_calls.forEach((toolCall, tcIndex) => {
          console.log(`        ${tcIndex + 1}. ${toolCall.function.name}`);
          console.log(`           Arguments: ${toolCall.function.arguments}`);
        });
      }
      if (msg.tool_call_id) {
        console.log(`     Tool call ID: ${msg.tool_call_id}`);
      }
      if (msg.content) {
        console.log(`     Content: ${msg.content.substring(0, 100)}...`);
      }
    });

    // 3. Simuler l'affichage dans l'interface
    console.log('\n🎨 Simulation de l\'affichage dans l\'interface:');
    console.log('=====================================');
    
    createdSession.thread.forEach((msg, index) => {
      console.log(`\n${index + 1}. [${msg.role.toUpperCase()}]`);
      
      if (msg.content) {
        console.log(`   Contenu: ${msg.content}`);
      }
      
      if (msg.tool_calls) {
        console.log(`   🔧 Tool Calls:`);
        msg.tool_calls.forEach((toolCall, tcIndex) => {
          console.log(`      ${tcIndex + 1}. ${toolCall.function.name}`);
          console.log(`         Arguments: ${toolCall.function.arguments}`);
        });
      }
      
      if (msg.tool_call_id) {
        console.log(`   📋 Tool Call ID: ${msg.tool_call_id}`);
      }
    });

    // 4. Nettoyer
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('❌ Erreur suppression session:', deleteError.message);
    } else {
      console.log('\n🧹 Session de test supprimée');
    }

    console.log('\n🎉 Test terminé !');
    console.log('\n💡 Pour tester dans l\'interface:');
    console.log('   1. Aller sur http://localhost:3000/chat');
    console.log('   2. Créer une nouvelle conversation');
    console.log('   3. Demander à l\'agent de créer une note');
    console.log('   4. Vérifier que les tool calls apparaissent');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testToolCallsDisplay(); 