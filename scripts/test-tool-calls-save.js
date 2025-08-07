require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testToolCallsSave() {
  try {
    console.log('🧪 Test de sauvegarde des tool calls...\n');

    // 1. Vérifier les sessions existantes
    console.log('🔍 Vérification des sessions existantes...');
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('id, name, thread')
      .limit(5);

    if (sessionsError) {
      console.error('❌ Erreur récupération sessions:', sessionsError.message);
      return;
    }

    console.log('📋 Sessions trouvées:', sessions.length);
    
    let totalMessages = 0;
    let totalToolCalls = 0;

    sessions.forEach((session, index) => {
      console.log(`\n${index + 1}. ${session.name} (${session.id})`);
      console.log(`   Thread: ${session.thread.length} messages`);
      totalMessages += session.thread.length;
      
      // Vérifier les tool calls dans le thread
      const toolCallMessages = session.thread.filter(msg => msg.tool_calls || msg.role === 'tool');
      if (toolCallMessages.length > 0) {
        console.log(`   ✅ Tool calls trouvés: ${toolCallMessages.length}`);
        totalToolCalls += toolCallMessages.length;
        
        toolCallMessages.forEach((msg, msgIndex) => {
          console.log(`      ${msgIndex + 1}. Role: ${msg.role}`);
          if (msg.tool_calls) {
            console.log(`         Tool calls: ${msg.tool_calls.length}`);
            msg.tool_calls.forEach((toolCall, tcIndex) => {
              console.log(`            ${tcIndex + 1}. ${toolCall.function.name}`);
            });
          }
          if (msg.tool_call_id) {
            console.log(`         Tool call ID: ${msg.tool_call_id}`);
          }
        });
      } else {
        console.log(`   ❌ Aucun tool call trouvé`);
      }
    });

    console.log('\n📊 Statistiques:');
    console.log(`   Total messages: ${totalMessages}`);
    console.log(`   Total tool calls: ${totalToolCalls}`);
    console.log(`   Sessions avec tool calls: ${sessions.filter(s => s.thread.some(msg => msg.tool_calls || msg.role === 'tool')).length}`);

    // 2. Vérifier la structure de la base de données
    console.log('\n🔍 Vérification de la structure de la base de données...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type')
      .eq('table_schema', 'public')
      .in('table_name', ['chat_sessions', 'chat_messages']);

    if (tablesError) {
      console.error('❌ Erreur récupération structure:', tablesError.message);
    } else {
      console.log('📋 Structure des tables:');
      const chatSessionsColumns = tables.filter(col => col.table_name === 'chat_sessions');
      const chatMessagesColumns = tables.filter(col => col.table_name === 'chat_messages');
      
      console.log('   chat_sessions:');
      chatSessionsColumns.forEach(col => {
        console.log(`     ${col.column_name}: ${col.data_type}`);
      });
      
      console.log('   chat_messages:');
      chatMessagesColumns.forEach(col => {
        console.log(`     ${col.column_name}: ${col.data_type}`);
      });
    }

    console.log('\n🎉 Test terminé !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testToolCallsSave(); 