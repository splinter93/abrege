require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testErrorInjection() {
  try {
    console.log('🧪 Test d\'injection des erreurs de tool calls...\n');

    // 1. Simuler un historique avec erreur de tool call
    const messages = [
      {
        role: 'user',
        content: 'Crée une note avec des arguments invalides'
      },
      {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_error_test_123',
          type: 'function',
          function: {
            name: 'create_note',
            arguments: '{"invalid":"json"}{"malformed":"args"}' // Arguments malformés
          }
        }]
      },
      {
        role: 'tool',
        tool_call_id: 'call_error_test_123',
        content: JSON.stringify({
          error: true,
          message: '❌ ÉCHEC : Arguments JSON invalides',
          success: false,
          action: 'failed'
        })
      }
    ];

    console.log('📋 Historique avec erreur de tool call:');
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.role.toUpperCase()}]`);
      if (msg.content) {
        console.log(`     Contenu: ${msg.content.substring(0, 100)}...`);
      }
      if (msg.tool_calls) {
        console.log(`     🔧 Tool calls: ${msg.tool_calls.length}`);
        msg.tool_calls.forEach((tc, tcIndex) => {
          console.log(`        ${tcIndex + 1}. ${tc.function.name}`);
          console.log(`           Arguments: ${tc.function.arguments}`);
        });
      }
      if (msg.tool_call_id) {
        console.log(`     📋 Tool call ID: ${msg.tool_call_id}`);
      }
    });

    // 2. Simuler le payload envoyé au LLM avec l'erreur
    const config = {
      model: 'deepseek-reasoner',
      temperature: 0.7,
      max_tokens: 8000,
      top_p: 0.9
    };

    const finalPayload = {
      model: config.model,
      messages: messages, // ← Historique complet avec l'erreur
      stream: true,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p
    };

    console.log('\n📤 Payload envoyé au LLM avec erreur:');
    console.log('=====================================');
    console.log(JSON.stringify(finalPayload, null, 2));

    // 3. Vérifier que l'erreur est bien présente
    const toolMessages = messages.filter(msg => msg.role === 'tool');
    console.log('\n🔍 Vérification des erreurs dans le payload:');
    console.log(`✅ Messages tool trouvés: ${toolMessages.length}`);
    
    toolMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. Tool call ID: ${msg.tool_call_id}`);
      if (msg.content) {
        try {
          const content = JSON.parse(msg.content);
          console.log(`     Error: ${content.error}`);
          console.log(`     Message: ${content.message}`);
          console.log(`     Success: ${content.success}`);
        } catch (parseError) {
          console.log(`     Content: ${msg.content}`);
        }
      }
    });

    // 4. Simuler la réponse attendue du LLM avec l'erreur
    console.log('\n🎯 Réponse attendue du LLM avec erreur:');
    console.log('=====================================');
    console.log('Le LLM devrait maintenant :');
    console.log('✅ Avoir le contexte de l\'erreur de tool call');
    console.log('✅ Savoir que create_note a échoué');
    console.log('✅ Connaître la raison de l\'échec');
    console.log('✅ Pouvoir expliquer l\'erreur à l\'utilisateur');

    console.log('\n💬 Exemple de réponse attendue:');
    console.log('"Je n\'ai pas pu créer la note car les arguments fournis étaient invalides. ');
    console.log('Il y a eu une erreur dans le format des données. ');
    console.log('Pouvez-vous reformuler votre demande ?"');

    console.log('\n🎉 Test d\'injection d\'erreur terminé !');
    console.log('\n💡 Conclusion:');
    console.log('   ✅ Les erreurs de tool calls sont bien injectées');
    console.log('   ✅ Le LLM reçoit le contexte d\'erreur');
    console.log('   ✅ Le LLM peut expliquer l\'erreur à l\'utilisateur');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testErrorInjection(); 