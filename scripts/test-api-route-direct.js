// 🧪 Test Direct de l'API Route
// Test de l'API route sans dépendance à la base de données

console.log('🧪 Test Direct de l\'API Route...\n');

// Configuration de test
const testConfig = {
  message: 'Dis-moi bonjour en français.',
  context: {
    sessionId: 'test-session-' + Date.now(),
    type: 'chat_session',
    id: 'test',
    name: 'Test Session'
  },
  history: [],
  provider: 'groq',
  channelId: 'test-channel-' + Date.now()
};

// Test de l'API route
async function testAPIRoute() {
  console.log('📋 Configuration de test:');
  console.log('   - Message:', testConfig.message);
  console.log('   - Provider:', testConfig.provider);
  console.log('   - Session ID:', testConfig.context.sessionId);
  console.log('   - Channel ID:', testConfig.channelId);

  try {
    console.log('\n📤 Envoi de la requête à l\'API route...');

    const response = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Token de test
      },
      body: JSON.stringify(testConfig)
    });

    console.log('📊 Statut de la réponse:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API route fonctionne !');
      console.log('📝 Réponse:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur API route:', response.status, response.statusText);
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion à l\'API route:', error.message);
    console.log('💡 Assurez-vous que le serveur est démarré: npm run dev');
  }
}

// Test avec différents providers
async function testAllProviders() {
  const providers = ['groq', 'together', 'deepseek', 'synesia'];
  
  console.log('\n🧪 Test avec tous les providers...');
  
  for (const provider of providers) {
    console.log(`\n📋 Test avec provider: ${provider}`);
    
    const testPayload = {
      ...testConfig,
      provider: provider,
      context: {
        ...testConfig.context,
        sessionId: `test-session-${provider}-${Date.now()}`
      }
    };

    try {
      const response = await fetch('http://localhost:3000/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        console.log(`   ✅ ${provider}: OK`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ ${provider}: ${response.status} - ${errorText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`   ❌ ${provider}: Erreur de connexion - ${error.message}`);
    }
  }
}

// Test avec agent spécifique
async function testWithAgent() {
  console.log('\n🧪 Test avec agent spécifique...');
  
  const testPayload = {
    ...testConfig,
    context: {
      ...testConfig.context,
      sessionId: `test-session-agent-${Date.now()}`,
      agentId: 'test-agent-id' // ID d'agent fictif
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📊 Statut avec agent:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Test avec agent réussi !');
      console.log('📝 Réponse:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur avec agent:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur test avec agent:', error.message);
  }
}

// Test de streaming
async function testStreaming() {
  console.log('\n🌊 Test de streaming...');
  
  const testPayload = {
    ...testConfig,
    context: {
      ...testConfig.context,
      sessionId: `test-session-streaming-${Date.now()}`
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(testPayload)
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
              if (parsed.token) {
                accumulatedContent += parsed.token;
                chunkCount++;
                process.stdout.write(parsed.token);
              }
            } catch (parseError) {
              // Ignorer les erreurs de parsing
            }
          }
        }
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur de streaming:', response.status, response.statusText);
      console.log('📝 Détails:', errorText);
    }
  } catch (error) {
    console.log('❌ Erreur de streaming:', error.message);
  }
}

// Exécuter tous les tests
async function runAllTests() {
  console.log('🚀 Démarrage des tests de l\'API route...\n');
  
  await testAPIRoute();
  await testAllProviders();
  await testWithAgent();
  await testStreaming();
  
  console.log('\n✅ Tests de l\'API route terminés !');
  console.log('🎯 Vérifiez les résultats ci-dessus pour identifier les problèmes.');
}

// Vérifier si le serveur est démarré
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:3000/api/chat/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ message: 'test' })
    });
    
    console.log('✅ Serveur accessible (statut:', response.status, ')');
    return true;
  } catch (error) {
    console.log('❌ Serveur non accessible:', error.message);
    console.log('💡 Démarrez le serveur avec: npm run dev');
    return false;
  }
}

// Exécuter les tests si le serveur est accessible
checkServerStatus().then(isAccessible => {
  if (isAccessible) {
    runAllTests();
  }
}); 