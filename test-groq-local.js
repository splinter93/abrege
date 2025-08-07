require('dotenv').config({ path: '.env.local' });

async function testGroqAPI() {
  console.log('🧪 Test local Groq API...');
  
  const payload = {
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant.'
      },
      {
        role: 'user',
        content: 'Dis bonjour'
      }
    ],
    stream: false, // Pas de streaming pour le test
    temperature: 0.7,
    max_completion_tokens: 100,
    top_p: 0.9
  };

  console.log('📤 Payload envoyé:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur Groq:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Réponse Groq:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testGroqAPI(); 