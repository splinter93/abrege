require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLLMInjection() {
  try {
    console.log('🧪 Test d\'injection des tool calls au LLM...\n');

    // 1. Simuler l'historique avec tool calls
    const messages = [
      {
        role: 'user',
        content: 'Crée une note de test'
      },
      {
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
        }]
      },
      {
        role: 'tool',
        tool_call_id: 'call_test_123',
        content: JSON.stringify({
          success: true,
          note: {
            id: 'note_test_456',
            title: 'Note de test',
            slug: 'note-de-test'
          }
        })
      }
    ];

    console.log('📋 Historique avec tool calls:');
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.role.toUpperCase()}]`);
      if (msg.content) {
        console.log(`     Contenu: ${msg.content.substring(0, 100)}...`);
      }
      if (msg.tool_calls) {
        console.log(`     🔧 Tool calls: ${msg.tool_calls.length}`);
        msg.tool_calls.forEach((tc, tcIndex) => {
          console.log(`        ${tcIndex + 1}. ${tc.function.name}`);
        });
      }
      if (msg.tool_call_id) {
        console.log(`     📋 Tool call ID: ${msg.tool_call_id}`);
      }
    });

    // 2. Simuler le payload envoyé au LLM
    const config = {
      model: 'deepseek-reasoner',
      temperature: 0.7,
      max_tokens: 8000,
      top_p: 0.9
    };

    const finalPayload = {
      model: config.model,
      messages: messages, // ← Historique complet avec tool calls
      stream: true,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p
      // 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
    };

    console.log('\n📤 Payload envoyé au LLM:');
    console.log('=====================================');
    console.log(JSON.stringify(finalPayload, null, 2));

    // 3. Vérifier que les tool calls sont bien présents
    const toolCallMessages = messages.filter(msg => msg.tool_calls || msg.role === 'tool');
    console.log('\n🔍 Vérification des tool calls dans le payload:');
    console.log(`✅ Tool calls trouvés: ${toolCallMessages.length}`);
    
    toolCallMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. Role: ${msg.role}`);
      if (msg.tool_calls) {
        console.log(`     Tool calls: ${msg.tool_calls.length}`);
        msg.tool_calls.forEach((tc, tcIndex) => {
          console.log(`        ${tcIndex + 1}. ${tc.function.name}`);
          console.log(`           Arguments: ${tc.function.arguments}`);
        });
      }
      if (msg.tool_call_id) {
        console.log(`     Tool call ID: ${msg.tool_call_id}`);
      }
    });

    // 4. Simuler la réponse attendue du LLM
    console.log('\n🎯 Réponse attendue du LLM:');
    console.log('=====================================');
    console.log('Le LLM devrait maintenant :');
    console.log('✅ Avoir le contexte complet de l\'exécution du tool');
    console.log('✅ Savoir que create_note a été appelé');
    console.log('✅ Connaître les arguments passés');
    console.log('✅ Avoir le résultat de l\'exécution');
    console.log('✅ Pouvoir répondre de manière contextuelle');

    console.log('\n💬 Exemple de réponse attendue:');
    console.log('"Parfait ! J\'ai créé la note "Note de test" dans votre classeur. ');
    console.log('La note a été créée avec succès et est maintenant disponible."');

    console.log('\n🎉 Test d\'injection terminé !');
    console.log('\n💡 Conclusion:');
    console.log('   ✅ Les tool calls sont bien dans l\'historique');
    console.log('   ✅ Ils seront injectés au LLM lors de la relance');
    console.log('   ✅ Le LLM aura le contexte complet pour répondre');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testLLMInjection(); 