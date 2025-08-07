// 🧪 Test Direct de l'API Groq
// Test de l'API Groq sans dépendance à la base de données

console.log('🧪 Test Direct de l\'API Groq...\n');

// 1. Vérifier la clé API Groq
const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  console.log('❌ GROQ_API_KEY manquante');
  console.log('📝 Ajoutez dans .env.local:');
  console.log('   GROQ_API_KEY=gsk_votre_cle_api_groq_ici');
  console.log('\n🔗 Obtenez une clé sur: https://console.groq.com/');
  process.exit(1);
}

console.log('✅ GROQ_API_KEY trouvée:', groqApiKey.substring(0, 10) + '...');

// 2. Test de connectivité
async function testGroqConnectivity() {
  console.log('\n🔧 2. Test de connectivité...');
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connectivité OK (', response.status, ')');
      console.log('📋 Modèles disponibles:', data.data?.length || 0);
      
      if (data.data) {
        data.data.forEach(model => {
          console.log(`   - ${model.id}`);
        });
      }
    } else {
      console.log('❌ Erreur de connectivité:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
  }
}

// 3. Test d'appel simple
async function testGroqCall() {
  console.log('\n🧪 3. Test d\'appel simple...');
  
  const payload = {
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant IA simple et utile.'
      },
      {
        role: 'user',
        content: 'Dis-moi bonjour en français.'
      }
    ],
    stream: false,
    temperature: 0.7,
    max_completion_tokens: 100,
    top_p: 0.9
  };

  try {
    console.log('📤 Envoi de la requête...');
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Appel réussi !');
      console.log('📝 Réponse:', data.choices?.[0]?.message?.content || 'Pas de contenu');
      console.log('📊 Usage:', data.usage);
    } else {
      console.log('❌ Erreur d\'appel:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur d\'appel:', error.message);
  }
}

// 4. Test de streaming
async function testGroqStreaming() {
  console.log('\n🌊 4. Test de streaming...');
  
  const payload = {
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant IA simple et utile.'
      },
      {
        role: 'user',
        content: 'Raconte-moi une courte histoire.'
      }
    ],
    stream: true,
    temperature: 0.7,
    max_completion_tokens: 200,
    top_p: 0.9
  };

  try {
    console.log('📤 Envoi de la requête streaming...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('✅ Streaming démarré !');
      
      const reader = response.body?.getReader();
      if (!reader) {
        console.log('❌ Impossible de lire le stream');
        return;
      }

      let accumulatedContent = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('\n✅ Streaming terminé');
              console.log('📝 Contenu final:', accumulatedContent);
              console.log('📊 Nombre de chunks:', chunkCount);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.content) {
                const token = delta.content;
                accumulatedContent += token;
                chunkCount++;
                process.stdout.write(token);
              }
            } catch (parseError) {
              // Ignorer les erreurs de parsing
            }
          }
        }
      }
    } else {
      console.log('❌ Erreur de streaming:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur de streaming:', error.message);
  }
}

// 5. Test avec function calling
async function testGroqFunctionCalling() {
  console.log('\n🔧 5. Test avec function calling...');
  
  const payload = {
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant IA simple et utile.'
      },
      {
        role: 'user',
        content: 'Quel est le temps qu\'il fait à Paris ?'
      }
    ],
    stream: false,
    temperature: 0.7,
    max_completion_tokens: 200,
    top_p: 0.9,
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Obtenir la météo pour une ville',
          parameters: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'Nom de la ville'
              }
            },
            required: ['city']
          }
        }
      }
    ],
    tool_choice: 'auto'
  };

  try {
    console.log('📤 Envoi de la requête avec function calling...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Function calling testé !');
      console.log('📝 Réponse:', JSON.stringify(data, null, 2));
      
      if (data.choices?.[0]?.message?.tool_calls) {
        console.log('🔧 Function calls détectés !');
        data.choices[0].message.tool_calls.forEach(toolCall => {
          console.log(`   - ${toolCall.function.name}: ${toolCall.function.arguments}`);
        });
      } else {
        console.log('📝 Pas de function calls dans la réponse');
      }
    } else {
      console.log('❌ Erreur function calling:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur function calling:', error.message);
  }
}

// Exécuter tous les tests
async function runAllTests() {
  await testGroqConnectivity();
  await testGroqCall();
  await testGroqStreaming();
  await testGroqFunctionCalling();
  
  console.log('\n✅ Tests terminés !');
  console.log('🎯 Si tous les tests passent, l\'API Groq fonctionne correctement.');
}

runAllTests(); 